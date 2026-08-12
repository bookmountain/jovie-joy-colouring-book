using System.Net;
using System.Net.Http.Json;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class AdminProductsMutationTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AdminProductsMutationTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Delete_removes_product_from_admin_public_collection_and_slug_references()
    {
        var slug = $"delete-one-{Guid.NewGuid():N}";
        var collectionSlug = $"delete-col-{Guid.NewGuid():N}";
        var orderItemId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var product = NewPublishedProduct(slug);
            var collection = new Collection
            {
                Slug = collectionSlug,
                Title = "Deletion collection",
                Excerpt = "",
                ProductOrder = new List<string> { slug },
            };
            var user = new User { Email = $"delete-{Guid.NewGuid():N}@example.com" };
            var order = new Order { Email = "buyer@example.com", TotalCents = product.PriceCents };
            var orderItem = new OrderItem
            {
                Id = orderItemId,
                Order = order,
                Product = product,
                ProductSlug = slug,
                TitleAtPurchase = product.Title,
                UnitPriceCents = product.PriceCents,
                Quantity = 1,
            };

            db.AddRange(product, collection, user, order, orderItem);
            db.ProductCollections.Add(new ProductCollection { Product = product, Collection = collection });
            db.Wishlists.Add(new Wishlist { User = user, ProductSlug = slug });
            db.NotifyMeRequests.Add(new NotifyMeRequest { Email = "waiting@example.com", ProductSlug = slug });
            await db.SaveChangesAsync();
        }

        var admin = await _factory.CreateAdminClientAsync();
        var response = await admin.DeleteAsync($"/api/admin/products/{slug}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"/api/admin/products/{slug}")).StatusCode);

        var adminList = await admin.GetFromJsonAsync<AdminProductListResponse>("/api/admin/products?pageSize=100");
        Assert.DoesNotContain(adminList!.Items, p => p.Slug == slug);

        var publicClient = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.NotFound, (await publicClient.GetAsync($"/api/products/{slug}")).StatusCode);
        var publicCatalog = await publicClient.GetFromJsonAsync<List<ProductDto>>("/api/products");
        Assert.DoesNotContain(publicCatalog!, p => p.Slug == slug);

        var collectionResponse = await publicClient.GetFromJsonAsync<CollectionWithProductsDto>($"/api/collections/{collectionSlug}");
        Assert.NotNull(collectionResponse);
        Assert.DoesNotContain(slug, collectionResponse!.Collection.ProductSlugs);
        Assert.DoesNotContain(collectionResponse.Products, p => p.Slug == slug);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.False(await db.Products.AnyAsync(p => p.Slug == slug));
            Assert.False(await db.ProductCollections.AnyAsync(pc => pc.Product.Slug == slug));
            Assert.False(await db.Wishlists.AnyAsync(w => w.ProductSlug == slug));
            Assert.False(await db.NotifyMeRequests.AnyAsync(n => n.ProductSlug == slug));

            var orderItem = await db.OrderItems.AsNoTracking().SingleAsync(i => i.Id == orderItemId);
            Assert.Null(orderItem.ProductId);
            Assert.Equal(slug, orderItem.ProductSlug);
            Assert.Equal("Product to delete", orderItem.TitleAtPurchase);

            var collection = await db.Collections.AsNoTracking().SingleAsync(c => c.Slug == collectionSlug);
            Assert.DoesNotContain(slug, collection.ProductOrder);
        }
    }

    private static Product NewPublishedProduct(string slug) => new()
    {
        Slug = slug,
        Title = "Product to delete",
        Excerpt = "Excerpt",
        Description = new List<string> { "Description" },
        PriceCents = 500,
        Available = true,
        ProductType = ProductType.Physical,
        Images = new List<string>(),
        Options = new List<ProductOption>(),
        Tags = new List<string>(),
        PublishedAt = DateTime.UtcNow.AddDays(-1),
    };
}
