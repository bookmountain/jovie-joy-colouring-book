using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class ProductsControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public ProductsControllerTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Get_by_slug_returns_404_when_missing()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/products/nonexistent");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task List_returns_seeded_product()
    {
        var slug = $"test-seed-{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            db.Products.Add(new Product
            {
                Slug = slug, Title = "Test Seed", Excerpt = "x",
                Description = new List<string> { "y" }, PriceCents = 100,
                ProductType = ProductType.Digital, PublishedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient();
        var products = await client.GetFromJsonAsync<List<ProductDto>>("/api/products");
        products.Should().NotBeNull();
        products!.Should().ContainSingle(p => p.Slug == slug);
    }

    [Fact]
    public async Task List_hides_drafts_and_scheduled_products()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            var suffix = Guid.NewGuid().ToString("N");
            db.Products.AddRange(
                PublicProduct($"public-visible-{suffix}", DateTime.UtcNow.AddDays(-1)),
                PublicProduct($"public-draft-{suffix}", null),
                PublicProduct($"public-scheduled-{suffix}", DateTime.UtcNow.AddDays(1))
            );
            await db.SaveChangesAsync();

            var collection = new Collection
            {
                Slug = $"public-collection-{suffix}",
                Title = "Public collection",
                Excerpt = "",
                DefaultSort = SortKey.Featured,
                ProductOrder = new List<string>
                {
                    $"public-visible-{suffix}",
                    $"public-draft-{suffix}",
                    $"public-scheduled-{suffix}",
                },
            };
            db.Collections.Add(collection);
            await db.SaveChangesAsync();

            var seededProducts = await db.Products
                .Where(p => p.Slug.EndsWith(suffix))
                .ToListAsync();
            foreach (var product in seededProducts)
            {
                db.ProductCollections.Add(new ProductCollection
                {
                    ProductId = product.Id,
                    CollectionId = collection.Id,
                });
            }
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient();
        var products = await client.GetFromJsonAsync<List<ProductDto>>("/api/products");
        products.Should().NotBeNull();
        products!.Should().Contain(p => p.Slug.StartsWith("public-visible-"));
        products.Should().NotContain(p => p.Slug.StartsWith("public-draft-"));
        products.Should().NotContain(p => p.Slug.StartsWith("public-scheduled-"));
    }

    [Fact]
    public async Task Get_by_slug_returns_404_for_unpublished_product()
    {
        string draftSlug;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            draftSlug = $"hidden-draft-{Guid.NewGuid():N}";
            db.Products.Add(PublicProduct(draftSlug, null));
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/products/{draftSlug}");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Collection_detail_hides_drafts_and_scheduled_products()
    {
        string collectionSlug;
        string visibleSlug;
        string draftSlug;
        string scheduledSlug;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            var suffix = Guid.NewGuid().ToString("N");
            visibleSlug = $"collection-visible-{suffix}";
            draftSlug = $"collection-draft-{suffix}";
            scheduledSlug = $"collection-scheduled-{suffix}";
            db.Products.AddRange(
                PublicProduct(visibleSlug, DateTime.UtcNow.AddDays(-1)),
                PublicProduct(draftSlug, null),
                PublicProduct(scheduledSlug, DateTime.UtcNow.AddDays(1))
            );
            await db.SaveChangesAsync();

            collectionSlug = $"collection-public-{suffix}";
            var collection = new Collection
            {
                Slug = collectionSlug,
                Title = "Public collection",
                Excerpt = "",
                DefaultSort = SortKey.Featured,
                ProductOrder = new List<string> { visibleSlug, draftSlug, scheduledSlug },
            };
            db.Collections.Add(collection);
            await db.SaveChangesAsync();

            var products = await db.Products
                .Where(p => p.Slug == visibleSlug || p.Slug == draftSlug || p.Slug == scheduledSlug)
                .ToListAsync();
            foreach (var product in products)
            {
                db.ProductCollections.Add(new ProductCollection
                {
                    ProductId = product.Id,
                    CollectionId = collection.Id,
                });
            }
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient();
        var response = await client.GetFromJsonAsync<CollectionWithProductsDto>($"/api/collections/{collectionSlug}");
        response.Should().NotBeNull();
        response!.Products.Should().ContainSingle(p => p.Slug == visibleSlug);
        response.Products.Should().NotContain(p => p.Slug == draftSlug);
        response.Products.Should().NotContain(p => p.Slug == scheduledSlug);
    }

    private static Product PublicProduct(string slug, DateTime? publishedAt) => new()
    {
        Slug = slug,
        Title = slug,
        Excerpt = "Public product",
        Description = new List<string> { "Description" },
        PriceCents = 100,
        Available = true,
        ProductType = ProductType.Physical,
        Images = new List<string> { "/uploads/products/public.png" },
        Options = new List<ProductOption> { new("Format", new List<string> { "Physical book" }) },
        PublishedAt = publishedAt,
    };
}
