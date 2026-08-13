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
            slug, question = "Original?", answer = "A",
            links = new[] { new { label = "Amazon", href = "https://www.amazon.com/" } },
            group = (string?)null, sortIndex = 0,
        });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<FaqDto>();
        Assert.Collection(created!.Links!, link =>
        {
            Assert.Equal("Amazon", link.Label);
            Assert.Equal("https://www.amazon.com/", link.Href);
        });

        var update = await client.PutAsJsonAsync($"/api/admin/faqs/{slug}", new
        {
            question = "Renamed?", answer = "B",
            links = new[] { new { label = "Penguin Random House", href = "https://www.penguinrandomhouse.com/" } },
            group = "general", sortIndex = 1,
        });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<FaqDto>();
        Assert.Equal("Renamed?", updated!.Question);
        Assert.Collection(updated.Links!, link => Assert.Equal("Penguin Random House", link.Label));

        var list = await client.GetFromJsonAsync<FaqDto[]>("/api/admin/faqs");
        Assert.Contains(list!, f =>
            f.Slug == slug &&
            f.Question == "Renamed?" &&
            f.Links?.Single().Label == "Penguin Random House");

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

    [Fact]
    public async Task Rejects_unsafe_retailer_link_schemes()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"faq-unsafe-{Guid.NewGuid():N}";

        var response = await client.PostAsJsonAsync("/api/admin/faqs", new
        {
            slug,
            question = "Unsafe link?",
            answer = "No.",
            links = new[] { new { label = "Bad link", href = "javascript:alert(1)" } },
            group = (string?)null,
            sortIndex = 0,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var list = await client.GetFromJsonAsync<FaqDto[]>("/api/admin/faqs");
        Assert.DoesNotContain(list!, faq => faq.Slug == slug);
    }
}
