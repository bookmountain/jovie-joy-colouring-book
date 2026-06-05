using System;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminComicsControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminComicsControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task World_crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();

        var create = await client.PostAsJsonAsync("/api/admin/comics", new { title = "Original", sortIndex = 0 });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<ComicWorldDto>();
        var id = created!.Id;

        var update = await client.PutAsJsonAsync($"/api/admin/comics/{id}", new { title = "Renamed", sortIndex = 1 });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<ComicWorldDto>();
        Assert.Equal("Renamed", updated!.Title);

        var list = await client.GetFromJsonAsync<ComicWorldDto[]>("/api/admin/comics");
        Assert.Contains(list!, w => w.Id == id && w.Title == "Renamed");

        var del = await client.DeleteAsync($"/api/admin/comics/{id}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<ComicWorldDto[]>("/api/admin/comics");
        Assert.DoesNotContain(after!, w => w.Id == id);
    }

    [Fact]
    public async Task Comic_under_a_world_crud_roundtrip()
    {
        var client = await _f.CreateAdminClientAsync();
        var world = await client.PostAsJsonAsync("/api/admin/comics", new { title = "W", sortIndex = 0 });
        var worldId = (await world.Content.ReadFromJsonAsync<ComicWorldDto>())!.Id;

        var create = await client.PostAsJsonAsync($"/api/admin/comics/{worldId}/comics", new
        {
            title = "C1", description = "d", hasDownload = false, images = Array.Empty<object>(), sortIndex = 0,
        });
        create.EnsureSuccessStatusCode();
        var comicId = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var del = await client.DeleteAsync($"/api/admin/comics/{worldId}/comics/{comicId}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/comics")).StatusCode);
    }
}
