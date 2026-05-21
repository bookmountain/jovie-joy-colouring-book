using System;
using System.Linq;
using System.Net.Http.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminProductsBulkTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminProductsBulkTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Bulk_publish_sets_publishedAt_for_each_slug()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedDraftProducts(2);
        var res = await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs, action = "publish" });
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<UpdatedEnvelope>();
        Assert.Equal(2, body!.Updated);
        foreach (var s in slugs)
        {
            var get = await client.GetAsync($"/api/admin/products/{s}");
            get.EnsureSuccessStatusCode();
            var p = await get.Content.ReadFromJsonAsync<ProductDto>();
            Assert.NotNull(p!.PublishedAt);
        }
    }

    [Fact]
    public async Task Bulk_unpublish_clears_publishedAt()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedPublishedProducts(2);
        var res = await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs, action = "unpublish" });
        res.EnsureSuccessStatusCode();
        foreach (var s in slugs)
        {
            var get = await client.GetAsync($"/api/admin/products/{s}");
            var p = await get.Content.ReadFromJsonAsync<ProductDto>();
            Assert.Null(p!.PublishedAt);
        }
    }

    [Fact]
    public async Task Bulk_delete_marks_unavailable()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedPublishedProducts(2);
        var res = await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs, action = "delete" });
        res.EnsureSuccessStatusCode();
        foreach (var s in slugs)
        {
            var get = await client.GetAsync($"/api/admin/products/{s}");
            var p = await get.Content.ReadFromJsonAsync<ProductDto>();
            Assert.False(p!.Available);
        }
    }

    [Fact]
    public async Task Bulk_add_to_collection_attaches_products()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedPublishedProducts(2);
        var collectionSlug = await _f.SeedCollection();
        var res = await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs, action = "add-to-collection", payload = new { collectionSlug } });
        res.EnsureSuccessStatusCode();
        foreach (var s in slugs)
        {
            var get = await client.GetAsync($"/api/admin/products/{s}");
            var p = await get.Content.ReadFromJsonAsync<ProductDto>();
            Assert.Contains(collectionSlug, p!.Collections);
        }
    }

    [Fact]
    public async Task Bulk_remove_from_collection_detaches_products()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedPublishedProducts(2);
        var collectionSlug = await _f.SeedCollection();
        // first attach
        await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs, action = "add-to-collection", payload = new { collectionSlug } });
        // then detach
        var res = await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs, action = "remove-from-collection", payload = new { collectionSlug } });
        res.EnsureSuccessStatusCode();
        foreach (var s in slugs)
        {
            var get = await client.GetAsync($"/api/admin/products/{s}");
            var p = await get.Content.ReadFromJsonAsync<ProductDto>();
            Assert.DoesNotContain(collectionSlug, p!.Collections);
        }
    }

    [Fact]
    public async Task Bulk_unknown_action_returns_400()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedPublishedProducts(1);
        var res = await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs, action = "nope" });
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Bulk_empty_slugs_returns_400()
    {
        var client = await _f.CreateAdminClientAsync();
        var res = await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs = Array.Empty<string>(), action = "publish" });
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, res.StatusCode);
    }

    private record UpdatedEnvelope(int Updated);
}
