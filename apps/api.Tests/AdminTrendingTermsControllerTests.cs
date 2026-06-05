using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminTrendingTermsControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminTrendingTermsControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();
        var term = $"term-{Guid.NewGuid():N}";

        var create = await client.PostAsJsonAsync("/api/admin/trending-terms", new { term, sortIndex = 0 });
        create.EnsureSuccessStatusCode();

        // Update is keyed by term; change the sort index.
        var update = await client.PutAsJsonAsync($"/api/admin/trending-terms/{Uri.EscapeDataString(term)}", new { sortIndex = 5 });
        update.EnsureSuccessStatusCode();

        var list = await client.GetFromJsonAsync<JsonElement>("/api/admin/trending-terms");
        Assert.Contains(list.EnumerateArray(),
            x => x.GetProperty("term").GetString() == term && x.GetProperty("sortIndex").GetInt32() == 5);

        var del = await client.DeleteAsync($"/api/admin/trending-terms/{Uri.EscapeDataString(term)}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<JsonElement>("/api/admin/trending-terms");
        Assert.DoesNotContain(after.EnumerateArray(), x => x.GetProperty("term").GetString() == term);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/trending-terms")).StatusCode);
    }
}
