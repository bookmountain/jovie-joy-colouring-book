using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class AdminProductsMutationTests : IClassFixture<ApiFactory>
{
    private static readonly byte[] ValidPng = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");

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

    [Fact]
    public async Task Delete_removes_only_local_product_assets()
    {
        var slug = $"delete-assets-{Guid.NewGuid():N}";
        var image = CreateUpload("products", "product.png");
        var review = CreateUpload("products", "review.png");
        var inspiration = CreateUpload("products", "inspiration.png");
        var source = CreateUpload("products", "source.png");
        var pdf = CreateUpload("pdfs", "book.pdf");
        var outsideSentinel = Path.Combine(_factory.ContentRoot, "do-not-delete.txt");
        await File.WriteAllTextAsync(outsideSentinel, "keep");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var product = NewPublishedProduct(slug);
            product.Images = [
                image,
                "https://cdn.example.test/remote.png",
                "/uploads/../do-not-delete.txt",
            ];
            product.ReviewImages = [review];
            product.InspirationImages = [inspiration];
            product.SourceLinks = [new SourceLink("Source", "/source", source, "Source")];
            product.PdfPath = pdf;
            db.Products.Add(product);
            await db.SaveChangesAsync();
        }

        var admin = await _factory.CreateAdminClientAsync();
        var response = await admin.DeleteAsync($"/api/admin/products/{slug}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.False(File.Exists(ToAbsolute(image)));
        Assert.False(File.Exists(ToAbsolute(review)));
        Assert.False(File.Exists(ToAbsolute(inspiration)));
        Assert.False(File.Exists(ToAbsolute(source)));
        Assert.False(File.Exists(ToAbsolute(pdf)));
        Assert.True(File.Exists(outsideSentinel));
        File.Delete(outsideSentinel);
    }

    [Fact]
    public async Task Delete_keeps_every_asset_path_referenced_by_a_surviving_duplicate()
    {
        var slug = $"shared-assets-{Guid.NewGuid():N}";
        var image = CreateUpload("products", "shared-product.png");
        var review = CreateUpload("products", "shared-review.png");
        var inspiration = CreateUpload("products", "shared-inspiration.png");
        var source = CreateUpload("products", "shared-source.png");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var original = NewPublishedProduct(slug);
            original.Images = [image];
            original.ReviewImages = [review];
            original.InspirationImages = [inspiration];
            original.SourceLinks = [new SourceLink("Source", "/source", source, "Source")];
            db.Products.Add(original);
            await db.SaveChangesAsync();
        }

        var admin = await _factory.CreateAdminClientAsync();
        var duplicateResponse = await admin.PostAsync($"/api/admin/products/{slug}/duplicate", null);
        duplicateResponse.EnsureSuccessStatusCode();
        var duplicate = await duplicateResponse.Content.ReadFromJsonAsync<ProductDto>();
        Assert.NotNull(duplicate);

        var deleteResponse = await admin.DeleteAsync($"/api/admin/products/{slug}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.True(File.Exists(ToAbsolute(image)));
        Assert.True(File.Exists(ToAbsolute(review)));
        Assert.True(File.Exists(ToAbsolute(inspiration)));
        Assert.True(File.Exists(ToAbsolute(source)));

        var survivor = await admin.GetFromJsonAsync<ProductDto>($"/api/admin/products/{duplicate!.Slug}");
        Assert.NotNull(survivor);
        Assert.Equal([image], survivor!.Images);
        Assert.Equal([review], survivor.ReviewImages);
        Assert.Equal([inspiration], survivor.InspirationImages);
        Assert.Equal(source, survivor.SourceLinks!.Single().Image);

        await admin.DeleteAsync($"/api/admin/products/{duplicate.Slug}");
        Assert.False(File.Exists(ToAbsolute(image)));
        Assert.False(File.Exists(ToAbsolute(review)));
        Assert.False(File.Exists(ToAbsolute(inspiration)));
        Assert.False(File.Exists(ToAbsolute(source)));
    }

    [Fact]
    public async Task Delete_keeps_shared_pdf_path_referenced_by_another_product()
    {
        var firstSlug = $"shared-pdf-a-{Guid.NewGuid():N}";
        var secondSlug = $"shared-pdf-b-{Guid.NewGuid():N}";
        var pdf = CreateUpload("pdfs", "shared-book.pdf");
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var first = NewPublishedProduct(firstSlug);
            first.PdfPath = pdf;
            var second = NewPublishedProduct(secondSlug);
            second.PdfPath = pdf;
            db.Products.AddRange(first, second);
            await db.SaveChangesAsync();
        }

        var admin = await _factory.CreateAdminClientAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/products/{firstSlug}")).StatusCode);
        Assert.True(File.Exists(ToAbsolute(pdf)));
        Assert.Equal(pdf, (await admin.GetFromJsonAsync<AdminProductDto>($"/api/admin/products/{secondSlug}"))!.PdfPath);

        await admin.DeleteAsync($"/api/admin/products/{secondSlug}");
        Assert.False(File.Exists(ToAbsolute(pdf)));
    }

    [Fact]
    public async Task Delete_keeps_a_local_product_image_referenced_by_another_cms_entity()
    {
        var slug = $"shared-collection-image-{Guid.NewGuid():N}";
        var image = CreateUpload("products", "shared-collection.png");
        var collectionSlug = $"shared-collection-{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var product = NewPublishedProduct(slug);
            product.Images = [image];
            db.Products.Add(product);
            db.Collections.Add(new Collection
            {
                Slug = collectionSlug,
                Title = "Shared image collection",
                Excerpt = "",
                HeroImage = image,
            });
            await db.SaveChangesAsync();
        }

        var admin = await _factory.CreateAdminClientAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/products/{slug}")).StatusCode);
        Assert.True(File.Exists(ToAbsolute(image)));

        Assert.Equal(HttpStatusCode.NoContent,
            (await admin.DeleteAsync($"/api/admin/collections/{collectionSlug}")).StatusCode);
        Assert.False(File.Exists(ToAbsolute(image)));
    }

    [Fact]
    public async Task Secondary_asset_upload_does_not_mutate_main_gallery_and_discard_is_reference_aware()
    {
        var slug = $"secondary-asset-{Guid.NewGuid():N}";
        const string existingGalleryImage = "/images/existing-gallery.png";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var product = NewPublishedProduct(slug);
            product.Images = [existingGalleryImage];
            db.Products.Add(product);
            await db.SaveChangesAsync();
        }

        var admin = await _factory.CreateAdminClientAsync();
        using var stagedForm = ImageForm("secondary.png");
        var stagedResponse = await admin.PostAsync(
            $"/api/admin/products/{slug}/images?intent=asset",
            stagedForm);
        stagedResponse.EnsureSuccessStatusCode();
        var staged = await stagedResponse.Content.ReadFromJsonAsync<UploadResponse>();
        Assert.NotNull(staged);
        Assert.True(File.Exists(ToAbsolute(staged!.Url)));

        var afterUpload = await admin.GetFromJsonAsync<AdminProductDto>($"/api/admin/products/{slug}");
        Assert.Equal([existingGalleryImage], afterUpload!.Images);
        Assert.Null(afterUpload.ReviewImages);

        var adopt = await admin.PutAsJsonAsync($"/api/admin/products/{slug}", new
        {
            title = afterUpload.Title,
            excerpt = afterUpload.Excerpt,
            description = afterUpload.Description,
            priceCents = afterUpload.PriceCents,
            compareAtPriceCents = afterUpload.CompareAtPriceCents,
            available = afterUpload.Available,
            productType = afterUpload.ProductType,
            images = afterUpload.Images,
            options = (object?)null,
            sourceLinks = (object?)null,
            reviewImages = new[] { staged.Url },
            inspirationImages = (string[]?)null,
            tags = afterUpload.Tags,
            collectionSlugs = Array.Empty<string>(),
            publishedAt = afterUpload.PublishedAt,
        });
        adopt.EnsureSuccessStatusCode();

        var discard = await admin.DeleteAsync(
            $"/api/admin/products/assets?url={Uri.EscapeDataString(staged.Url)}");
        Assert.Equal(HttpStatusCode.NoContent, discard.StatusCode);
        Assert.True(File.Exists(ToAbsolute(staged.Url)));

        var adopted = await admin.GetFromJsonAsync<AdminProductDto>($"/api/admin/products/{slug}");
        Assert.Equal([existingGalleryImage], adopted!.Images);
        Assert.Equal([staged.Url], adopted.ReviewImages);

        var removeReference = await admin.PutAsJsonAsync($"/api/admin/products/{slug}", new
        {
            title = adopted.Title,
            excerpt = adopted.Excerpt,
            description = adopted.Description,
            priceCents = adopted.PriceCents,
            compareAtPriceCents = adopted.CompareAtPriceCents,
            available = adopted.Available,
            productType = adopted.ProductType,
            images = adopted.Images,
            options = (object?)null,
            sourceLinks = (object?)null,
            reviewImages = (string[]?)null,
            inspirationImages = (string[]?)null,
            tags = adopted.Tags,
            collectionSlugs = Array.Empty<string>(),
            publishedAt = adopted.PublishedAt,
        });
        removeReference.EnsureSuccessStatusCode();
        Assert.False(File.Exists(ToAbsolute(staged.Url)));

        await admin.DeleteAsync($"/api/admin/products/{slug}");
    }

    [Fact]
    public async Task Image_upload_without_intent_remains_a_gallery_upload_for_existing_clients()
    {
        var slug = $"gallery-default-{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Products.Add(NewPublishedProduct(slug));
            await db.SaveChangesAsync();
        }

        var admin = await _factory.CreateAdminClientAsync();
        using var form = ImageForm("gallery.png");
        var response = await admin.PostAsync($"/api/admin/products/{slug}/images", form);
        response.EnsureSuccessStatusCode();
        var upload = await response.Content.ReadFromJsonAsync<UploadResponse>();

        var product = await admin.GetFromJsonAsync<AdminProductDto>($"/api/admin/products/{slug}");
        Assert.Equal([upload!.Url], product!.Images);

        await admin.DeleteAsync($"/api/admin/products/{slug}");
        Assert.False(File.Exists(ToAbsolute(upload.Url)));
    }

    private string CreateUpload(string folder, string fileName)
    {
        var relative = $"/uploads/{folder}/{fileName}";
        var absolute = ToAbsolute(relative);
        Directory.CreateDirectory(Path.GetDirectoryName(absolute)!);
        File.WriteAllBytes(absolute, [1, 2, 3, 4]);
        return relative;
    }

    private string ToAbsolute(string relative) =>
        Path.Combine(_factory.ContentRoot, relative.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

    private static MultipartFormDataContent ImageForm(string fileName)
    {
        var body = new MultipartFormDataContent();
        var image = new ByteArrayContent(ValidPng);
        image.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        body.Add(image, "file", fileName);
        return body;
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
