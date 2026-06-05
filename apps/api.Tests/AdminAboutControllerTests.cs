using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminAboutControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminAboutControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();

        var create = await client.PostAsJsonAsync("/api/admin/about", new
        {
            title = "Original", body = new List<string> { "p1" },
            image = "", alt = "", background = "cream", sortIndex = 0,
        });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<AboutSectionDto>();
        var id = created!.Id;

        var update = await client.PutAsJsonAsync($"/api/admin/about/{id}", new
        {
            title = "Renamed", body = new List<string> { "p1", "p2" },
            image = "", alt = "", background = "cream", sortIndex = 1,
        });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<AboutSectionDto>();
        Assert.Equal("Renamed", updated!.Title);

        var list = await client.GetFromJsonAsync<AboutSectionDto[]>("/api/admin/about");
        Assert.Contains(list!, a => a.Id == id && a.Title == "Renamed");

        var del = await client.DeleteAsync($"/api/admin/about/{id}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<AboutSectionDto[]>("/api/admin/about");
        Assert.DoesNotContain(after!, a => a.Id == id);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/about")).StatusCode);
    }
}
