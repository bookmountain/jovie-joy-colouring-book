using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminStaticPagesControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminStaticPagesControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"page-{Guid.NewGuid():N}";

        var create = await client.PostAsJsonAsync("/api/admin/static-pages", new
        {
            slug, title = "Original", intro = "i", blocks = new List<string> { "b1" },
        });
        create.EnsureSuccessStatusCode();

        var update = await client.PutAsJsonAsync($"/api/admin/static-pages/{slug}", new
        {
            title = "Renamed", intro = "i2", blocks = new List<string> { "b1", "b2" },
        });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Renamed", updated.GetProperty("title").GetString());

        var list = await client.GetFromJsonAsync<JsonElement>("/api/admin/static-pages");
        Assert.Contains(list.EnumerateArray(),
            p => p.GetProperty("slug").GetString() == slug && p.GetProperty("title").GetString() == "Renamed");

        var del = await client.DeleteAsync($"/api/admin/static-pages/{slug}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<JsonElement>("/api/admin/static-pages");
        Assert.DoesNotContain(after.EnumerateArray(), p => p.GetProperty("slug").GetString() == slug);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/static-pages")).StatusCode);
    }
}
