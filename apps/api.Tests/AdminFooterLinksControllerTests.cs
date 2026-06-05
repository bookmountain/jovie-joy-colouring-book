using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminFooterLinksControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminFooterLinksControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();

        var create = await client.PostAsJsonAsync("/api/admin/footer-links", new
        {
            groupKey = "shop", groupTitle = "Shop", label = "Original", href = "/x", sortIndex = 0,
        });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetGuid();

        var update = await client.PutAsJsonAsync($"/api/admin/footer-links/{id}", new
        {
            groupKey = "shop", groupTitle = "Shop", label = "Renamed", href = "/x", sortIndex = 1,
        });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Renamed", updated.GetProperty("label").GetString());

        var list = await client.GetFromJsonAsync<JsonElement>("/api/admin/footer-links");
        Assert.Contains(list.EnumerateArray(),
            x => x.GetProperty("id").GetGuid() == id && x.GetProperty("label").GetString() == "Renamed");

        var del = await client.DeleteAsync($"/api/admin/footer-links/{id}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<JsonElement>("/api/admin/footer-links");
        Assert.DoesNotContain(after.EnumerateArray(), x => x.GetProperty("id").GetGuid() == id);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/footer-links")).StatusCode);
    }
}
