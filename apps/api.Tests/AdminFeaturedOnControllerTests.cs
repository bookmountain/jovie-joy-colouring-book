using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminFeaturedOnControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminFeaturedOnControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"feat-{Guid.NewGuid():N}";

        var create = await client.PostAsJsonAsync("/api/admin/featured-on", new
        {
            slug, label = "Original", href = "https://x.test", image = "", alt = "", sortIndex = 0,
        });
        create.EnsureSuccessStatusCode();

        var update = await client.PutAsJsonAsync($"/api/admin/featured-on/{slug}", new
        {
            label = "Renamed", href = "https://x.test", image = "", alt = "", sortIndex = 1,
        });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Renamed", updated.GetProperty("label").GetString());

        var list = await client.GetFromJsonAsync<JsonElement>("/api/admin/featured-on");
        Assert.Contains(list.EnumerateArray(),
            x => x.GetProperty("slug").GetString() == slug && x.GetProperty("label").GetString() == "Renamed");

        var del = await client.DeleteAsync($"/api/admin/featured-on/{slug}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<JsonElement>("/api/admin/featured-on");
        Assert.DoesNotContain(after.EnumerateArray(), x => x.GetProperty("slug").GetString() == slug);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/featured-on")).StatusCode);
    }
}
