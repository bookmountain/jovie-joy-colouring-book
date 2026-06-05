using System;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminGalleryControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminGalleryControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();

        var create = await client.PostAsJsonAsync("/api/admin/gallery", new
        {
            src = "/uploads/gallery/a.png", alt = "Original", sortIndex = 0,
        });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<GalleryImageDto>();
        var id = created!.Id;

        var update = await client.PutAsJsonAsync($"/api/admin/gallery/{id}", new
        {
            src = "/uploads/gallery/a.png", alt = "Renamed", sortIndex = 1,
        });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<GalleryImageDto>();
        Assert.Equal("Renamed", updated!.Alt);

        var list = await client.GetFromJsonAsync<GalleryImageDto[]>("/api/admin/gallery");
        Assert.Contains(list!, g => g.Id == id && g.Alt == "Renamed");

        var del = await client.DeleteAsync($"/api/admin/gallery/{id}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<GalleryImageDto[]>("/api/admin/gallery");
        Assert.DoesNotContain(after!, g => g.Id == id);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/gallery")).StatusCode);
    }
}
