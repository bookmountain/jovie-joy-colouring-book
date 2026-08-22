using System;
using System.Linq;
using System.Net.Http.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Controllers;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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

    [Theory]
    [InlineData("mark-available", true)]
    [InlineData("mark-unavailable", false)]
    public async Task Bulk_availability_actions_change_only_availability(string action, bool expectedAvailable)
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedPublishedProducts(1);
        var originalPublishedAt = DateTime.UtcNow.AddDays(-3);
        using (var scope = _f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<Data.AppDbContext>();
            var product = await db.Products.SingleAsync(p => p.Slug == slugs[0]);
            product.Available = !expectedAvailable;
            product.PublishedAt = originalPublishedAt;
            await db.SaveChangesAsync();
        }

        var response = await client.PostAsJsonAsync("/api/admin/products/bulk", new { slugs, action });
        response.EnsureSuccessStatusCode();

        var productResponse = await client.GetFromJsonAsync<ProductDto>($"/api/admin/products/{slugs[0]}");
        Assert.NotNull(productResponse);
        Assert.Equal(expectedAvailable, productResponse!.Available);
        Assert.Equal(originalPublishedAt, productResponse.PublishedAt);
    }

    [Fact]
    public async Task Bulk_publish_does_not_mark_an_unavailable_product_available()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedDraftProducts(1);
        using (var scope = _f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<Data.AppDbContext>();
            var product = await db.Products.SingleAsync(p => p.Slug == slugs[0]);
            product.Available = false;
            await db.SaveChangesAsync();
        }

        var response = await client.PostAsJsonAsync("/api/admin/products/bulk", new { slugs, action = "publish" });
        response.EnsureSuccessStatusCode();
        var productResponse = await client.GetFromJsonAsync<ProductDto>($"/api/admin/products/{slugs[0]}");
        Assert.NotNull(productResponse);
        Assert.False(productResponse!.Available);
        Assert.NotNull(productResponse.PublishedAt);
    }

    [Fact]
    public async Task Bulk_publish_accepts_a_digital_product_without_a_pdf()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedDraftProducts(2);
        using (var scope = _f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<Data.AppDbContext>();
            var digital = await db.Products.SingleAsync(product => product.Slug == slugs[1]);
            digital.ProductType = ProductType.Digital;
            digital.PdfPath = null;
            await db.SaveChangesAsync();
        }

        var response = await client.PostAsJsonAsync("/api/admin/products/bulk", new
        {
            slugs,
            action = "publish"
        });

        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);

        using var verifyScope = _f.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<Data.AppDbContext>();
        var products = await verifyDb.Products
            .Where(product => slugs.Contains(product.Slug))
            .ToListAsync();
        Assert.All(products, product => Assert.NotNull(product.PublishedAt));
    }

    [Fact]
    public async Task Bulk_delete_removes_products_from_admin_and_public_catalogs()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedPublishedProducts(2);
        var res = await client.PostAsJsonAsync("/api/admin/products/bulk",
            new { slugs, action = "delete" });
        res.EnsureSuccessStatusCode();
        foreach (var s in slugs)
        {
            Assert.Equal(System.Net.HttpStatusCode.NotFound,
                (await client.GetAsync($"/api/admin/products/{s}")).StatusCode);
            Assert.Equal(System.Net.HttpStatusCode.NotFound,
                (await _f.CreateClient().GetAsync($"/api/products/{s}")).StatusCode);
        }

        using var scope = _f.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Data.AppDbContext>();
        Assert.False(await db.Products.AnyAsync(p => slugs.Contains(p.Slug)));
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

    [Fact]
    public async Task Bulk_deduplicates_slugs_and_reports_missing_without_blocking_existing_products()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedDraftProducts(1);
        var existing = slugs[0];
        var missing = $"missing-{Guid.NewGuid():N}";

        var response = await client.PostAsJsonAsync("/api/admin/products/bulk", new
        {
            slugs = new[] { existing, missing, existing, $" {existing} " },
            action = "publish"
        });

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<UpdatedEnvelope>();
        Assert.NotNull(result);
        Assert.Equal(1, result!.Updated);
        Assert.Equal([missing], result.Missing);

        var product = await client.GetFromJsonAsync<ProductDto>($"/api/admin/products/{existing}");
        Assert.NotNull(product?.PublishedAt);
    }

    [Fact]
    public async Task Bulk_rejects_requests_over_the_limit_without_updating_products()
    {
        var client = await _f.CreateAdminClientAsync();
        var slugs = await _f.SeedDraftProducts(1);
        var requested = Enumerable.Range(0, AdminProductsController.MaxBulkProducts)
            .Select(index => $"missing-{Guid.NewGuid():N}-{index}")
            .Prepend(slugs[0])
            .ToArray();

        var response = await client.PostAsJsonAsync("/api/admin/products/bulk", new
        {
            slugs = requested,
            action = "publish"
        });

        Assert.Equal(System.Net.HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorEnvelope>();
        Assert.Contains(AdminProductsController.MaxBulkProducts.ToString(), error!.Error);

        var product = await client.GetFromJsonAsync<ProductDto>($"/api/admin/products/{slugs[0]}");
        Assert.Null(product!.PublishedAt);
    }

    private record UpdatedEnvelope(int Updated, List<string> Missing);
    private record ErrorEnvelope(string Error);
}
