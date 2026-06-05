using System;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminBlogsControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminBlogsControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Category_crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"cat-{Guid.NewGuid():N}";

        var create = await client.PostAsJsonAsync("/api/admin/blogs",
            new { slug, title = "Original", excerpt = "ex", image = "", sortIndex = 0 });
        create.EnsureSuccessStatusCode();

        var update = await client.PutAsJsonAsync($"/api/admin/blogs/{slug}",
            new { title = "Renamed", excerpt = "ex2", image = "", sortIndex = 1 });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<BlogCategoryDto>();
        Assert.Equal("Renamed", updated!.Title);

        var list = await client.GetFromJsonAsync<BlogCategoryDto[]>("/api/admin/blogs");
        Assert.Contains(list!, c => c.Slug == slug && c.Title == "Renamed");

        var del = await client.DeleteAsync($"/api/admin/blogs/{slug}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<BlogCategoryDto[]>("/api/admin/blogs");
        Assert.DoesNotContain(after!, c => c.Slug == slug);
    }

    [Fact]
    public async Task Article_crud_roundtrip_under_a_category()
    {
        var client = await _f.CreateAdminClientAsync();
        var cat = $"cat-{Guid.NewGuid():N}";
        (await client.PostAsJsonAsync("/api/admin/blogs",
            new { slug = cat, title = "Cat", excerpt = "", image = "", sortIndex = 0 })).EnsureSuccessStatusCode();

        var aSlug = $"art-{Guid.NewGuid():N}";
        var create = await client.PostAsJsonAsync($"/api/admin/blogs/{cat}/articles",
            new { slug = aSlug, title = "A1", excerpt = "", image = "", body = new[] { "p" }, sortIndex = 0 });
        create.EnsureSuccessStatusCode();

        var update = await client.PutAsJsonAsync($"/api/admin/blogs/{cat}/articles/{aSlug}",
            new { title = "A1 renamed", excerpt = "", image = "", body = new[] { "p" }, sortIndex = 0 });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<ArticleDto>();
        Assert.Equal("A1 renamed", updated!.Title);

        var del = await client.DeleteAsync($"/api/admin/blogs/{cat}/articles/{aSlug}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/blogs")).StatusCode);
    }
}
