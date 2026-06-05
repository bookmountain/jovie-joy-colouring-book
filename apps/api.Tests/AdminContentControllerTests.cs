using System;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminContentControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminContentControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Upsert_then_update_then_delete_roundtrip()
    {
        var client = await _f.CreateAdminClientAsync();
        var key = $"test.block.{Guid.NewGuid():N}";

        // Upsert creates the block.
        var create = await client.PutAsJsonAsync($"/api/admin/content/{key}", new
        {
            type = "HomeHero",
            data = new { title = "Original" },
            sortIndex = 0,
        });
        create.EnsureSuccessStatusCode();

        // Upsert again updates it.
        var update = await client.PutAsJsonAsync($"/api/admin/content/{key}", new
        {
            type = "HomeHero",
            data = new { title = "Renamed" },
            sortIndex = 3,
        });
        update.EnsureSuccessStatusCode();

        var got = await client.GetFromJsonAsync<JsonElement>($"/api/admin/content/{key}");
        Assert.Equal(3, got.GetProperty("sortIndex").GetInt32());
        Assert.Equal("Renamed", got.GetProperty("data").GetProperty("title").GetString());

        var del = await client.DeleteAsync($"/api/admin/content/{key}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetAsync($"/api/admin/content/{key}");
        Assert.Equal(HttpStatusCode.NotFound, after.StatusCode);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/content")).StatusCode);
    }
}
