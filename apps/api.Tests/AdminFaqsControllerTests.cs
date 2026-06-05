using System;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminFaqsControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminFaqsControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"faq-{Guid.NewGuid():N}";

        var create = await client.PostAsJsonAsync("/api/admin/faqs", new
        {
            slug, question = "Original?", answer = "A", group = (string?)null, sortIndex = 0,
        });
        create.EnsureSuccessStatusCode();

        var update = await client.PutAsJsonAsync($"/api/admin/faqs/{slug}", new
        {
            question = "Renamed?", answer = "B", group = "general", sortIndex = 1,
        });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<FaqDto>();
        Assert.Equal("Renamed?", updated!.Question);

        var list = await client.GetFromJsonAsync<FaqDto[]>("/api/admin/faqs");
        Assert.Contains(list!, f => f.Slug == slug && f.Question == "Renamed?");

        var del = await client.DeleteAsync($"/api/admin/faqs/{slug}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<FaqDto[]>("/api/admin/faqs");
        Assert.DoesNotContain(after!, f => f.Slug == slug);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/faqs")).StatusCode);
    }
}
