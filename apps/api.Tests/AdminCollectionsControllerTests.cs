using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminCollectionsControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminCollectionsControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"col-{Guid.NewGuid():N}";

        var create = await client.PostAsJsonAsync("/api/admin/collections", new
        {
            slug, title = "Original", excerpt = "ex", heroImage = (string?)null,
            defaultSort = "Featured", homepageSlot = (string?)null,
            productOrder = Array.Empty<string>(), sortIndex = 0,
        });
        create.EnsureSuccessStatusCode();

        var update = await client.PutAsJsonAsync($"/api/admin/collections/{slug}", new
        {
            title = "Renamed", excerpt = "ex2", heroImage = (string?)null,
            defaultSort = "Featured", homepageSlot = (string?)null,
            productOrder = Array.Empty<string>(), sortIndex = 1,
        });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<CollectionDto>();
        Assert.Equal("Renamed", updated!.Title);

        var list = await client.GetFromJsonAsync<CollectionDto[]>("/api/admin/collections");
        Assert.Contains(list!, c => c.Slug == slug && c.Title == "Renamed");

        var del = await client.DeleteAsync($"/api/admin/collections/{slug}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<CollectionDto[]>("/api/admin/collections");
        Assert.DoesNotContain(after!, c => c.Slug == slug);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/collections")).StatusCode);
    }
}
