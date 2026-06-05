using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminSocialLinksControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminSocialLinksControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();
        var label = $"Social-{Guid.NewGuid():N}";

        var create = await client.PostAsJsonAsync("/api/admin/social-links", new
        {
            label, href = "https://a.test", sortIndex = 0,
        });
        create.EnsureSuccessStatusCode();

        // Update is keyed by label; change the href.
        var update = await client.PutAsJsonAsync($"/api/admin/social-links/{Uri.EscapeDataString(label)}", new
        {
            href = "https://b.test", sortIndex = 1,
        });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("https://b.test", updated.GetProperty("href").GetString());

        var list = await client.GetFromJsonAsync<JsonElement>("/api/admin/social-links");
        Assert.Contains(list.EnumerateArray(),
            x => x.GetProperty("label").GetString() == label && x.GetProperty("href").GetString() == "https://b.test");

        var del = await client.DeleteAsync($"/api/admin/social-links/{Uri.EscapeDataString(label)}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<JsonElement>("/api/admin/social-links");
        Assert.DoesNotContain(after.EnumerateArray(), x => x.GetProperty("label").GetString() == label);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/social-links")).StatusCode);
    }
}
