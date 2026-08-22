using JovieJoy.Api.Contracts;
using JovieJoy.Api.Controllers;
using JovieJoy.Api.Controllers.Admin;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Tests;

public class AdminCatalogAtomicityTests
{
    [Fact]
    public async Task Product_create_failure_does_not_leave_entity_or_membership()
    {
        await using var db = CreateContext();
        var collection = NewCollection("product-create-collection");
        db.Collections.Add(collection);
        await db.SaveChangesAsync();
        db.ResetSaveAttempts();

        var controller = ProductController(db);
        db.FailNextSave = true;

        await Assert.ThrowsAsync<DbUpdateException>(() => controller.Create(
            NewCreateProductRequest("atomic-product-create", [collection.Slug]),
            CancellationToken.None));

        Assert.Equal(1, db.SaveAttempts);
        db.ChangeTracker.Clear();
        Assert.False(await db.Products.AnyAsync(row => row.Slug == "atomic-product-create"));
        Assert.Empty(await db.ProductCollections.ToListAsync());
    }

    [Fact]
    public async Task Product_update_failure_preserves_scalar_fields_and_memberships()
    {
        await using var db = CreateContext();
        var oldCollection = NewCollection("product-update-old");
        var newCollection = NewCollection("product-update-new");
        var product = NewProduct("atomic-product-update");
        db.AddRange(oldCollection, newCollection, product);
        db.ProductCollections.Add(new ProductCollection
        {
            Product = product,
            Collection = oldCollection,
        });
        await db.SaveChangesAsync();
        db.ResetSaveAttempts();

        var controller = ProductController(db);
        db.FailNextSave = true;
        var request = new UpdateProductRequest(
            "Changed title", "Changed excerpt", ["Changed description"],
            999, null, false, "digital", ["/uploads/products/changed.png"],
            null, null, null, null, ["Changed"], [newCollection.Slug], null);

        await Assert.ThrowsAsync<DbUpdateException>(() => controller.Update(
            product.Slug,
            request,
            CancellationToken.None));

        Assert.Equal(1, db.SaveAttempts);
        db.ChangeTracker.Clear();
        var persisted = await db.Products.AsNoTracking().SingleAsync(row => row.Id == product.Id);
        Assert.Equal("Original title", persisted.Title);
        Assert.Equal(100, persisted.PriceCents);
        Assert.True(persisted.Available);
        Assert.Equal(ProductType.Physical, persisted.ProductType);
        var membership = await db.ProductCollections.AsNoTracking().SingleAsync();
        Assert.Equal(oldCollection.Id, membership.CollectionId);
    }

    [Fact]
    public async Task Collection_create_failure_preserves_slot_owner_and_leaves_no_membership()
    {
        await using var db = CreateContext();
        var product = NewProduct("collection-create-product");
        var existingSlotOwner = NewCollection("existing-slot-owner");
        existingSlotOwner.HomepageSlot = HomepageSlot.NewRelease;
        db.AddRange(product, existingSlotOwner);
        await db.SaveChangesAsync();
        db.ResetSaveAttempts();

        var controller = CollectionController(db);
        db.FailNextSave = true;
        var request = new CreateCollectionRequest(
            "atomic-collection-create", "New collection", "Excerpt", null,
            "Featured", "NewRelease", [product.Slug], 7);

        await Assert.ThrowsAsync<DbUpdateException>(() => controller.Create(request, CancellationToken.None));

        Assert.Equal(1, db.SaveAttempts);
        db.ChangeTracker.Clear();
        Assert.False(await db.Collections.AnyAsync(row => row.Slug == request.Slug));
        Assert.Equal(
            HomepageSlot.NewRelease,
            (await db.Collections.AsNoTracking().SingleAsync(row => row.Id == existingSlotOwner.Id)).HomepageSlot);
        Assert.Empty(await db.ProductCollections.ToListAsync());
    }

    [Fact]
    public async Task Collection_update_failure_preserves_order_fields_slot_and_membership()
    {
        await using var db = CreateContext();
        var oldProduct = NewProduct("collection-update-old-product");
        var newProduct = NewProduct("collection-update-new-product");
        var collection = NewCollection("atomic-collection-update");
        collection.Title = "Original collection";
        collection.ProductOrder = [oldProduct.Slug];
        var competingSlotOwner = NewCollection("competing-slot-owner");
        competingSlotOwner.HomepageSlot = HomepageSlot.BestSeller;
        db.AddRange(oldProduct, newProduct, collection, competingSlotOwner);
        db.ProductCollections.Add(new ProductCollection
        {
            Product = oldProduct,
            Collection = collection,
        });
        await db.SaveChangesAsync();
        db.ResetSaveAttempts();

        var controller = CollectionController(db);
        db.FailNextSave = true;
        var request = new UpdateCollectionRequest(
            "Changed collection", "Changed excerpt", null,
            "PriceAscending", "BestSeller", [newProduct.Slug], 99);

        await Assert.ThrowsAsync<DbUpdateException>(() => controller.Update(
            collection.Slug,
            request,
            CancellationToken.None));

        Assert.Equal(1, db.SaveAttempts);
        db.ChangeTracker.Clear();
        var persisted = await db.Collections.AsNoTracking().SingleAsync(row => row.Id == collection.Id);
        Assert.Equal("Original collection", persisted.Title);
        Assert.Equal([oldProduct.Slug], persisted.ProductOrder);
        Assert.Null(persisted.HomepageSlot);
        Assert.Equal(
            HomepageSlot.BestSeller,
            (await db.Collections.AsNoTracking().SingleAsync(row => row.Id == competingSlotOwner.Id)).HomepageSlot);
        var membership = await db.ProductCollections.AsNoTracking().SingleAsync();
        Assert.Equal(oldProduct.Id, membership.ProductId);
    }

    private static FailNextSaveDbContext CreateContext() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"catalog-atomicity-{Guid.NewGuid():N}")
            .Options);

    private static AdminProductsController ProductController(AppDbContext db) =>
        new(db, new UnusedUploadService(), new NoopAssetCleanup());

    private static AdminCollectionsController CollectionController(AppDbContext db) =>
        new(db, new UnusedUploadService(), new NoopAssetCleanup());

    private static CreateProductRequest NewCreateProductRequest(string slug, List<string> collectionSlugs) => new(
        slug, "New product", "Excerpt", ["Description"],
        100, null, true, "physical", [], null, null, null, null, [], collectionSlugs, null);

    private static Product NewProduct(string slug) => new()
    {
        Slug = slug,
        Title = "Original title",
        Excerpt = "Original excerpt",
        Description = ["Original description"],
        PriceCents = 100,
        Available = true,
        ProductType = ProductType.Physical,
        Images = [],
        Options = [new ProductOption("Format", ["Default Title"])],
        Tags = [],
    };

    private static Collection NewCollection(string slug) => new()
    {
        Slug = slug,
        Title = slug,
        Excerpt = "Excerpt",
        DefaultSort = SortKey.Featured,
        ProductOrder = [],
    };

    private sealed class FailNextSaveDbContext(DbContextOptions<AppDbContext> options) : AppDbContext(options)
    {
        public bool FailNextSave { get; set; }
        public int SaveAttempts { get; private set; }

        public void ResetSaveAttempts() => SaveAttempts = 0;

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveAttempts += 1;
            if (!FailNextSave) return base.SaveChangesAsync(cancellationToken);
            FailNextSave = false;
            return Task.FromException<int>(new DbUpdateException("Injected catalog write failure"));
        }
    }

    private sealed class NoopAssetCleanup : IAssetCleanupService
    {
        public Task DeleteUnreferencedAsync(IEnumerable<string?> candidates, CancellationToken ct) =>
            Task.CompletedTask;

        public Task<IReadOnlySet<string>> ReadReferencedLocalUrlsAsync(CancellationToken ct) =>
            Task.FromResult<IReadOnlySet<string>>(new HashSet<string>(StringComparer.Ordinal));
    }

    private sealed class UnusedUploadService : IUploadService
    {
        public Task<string> SaveImageAsync(
            IFormFile file,
            string subfolder,
            string filePrefix,
            CancellationToken ct) => throw new NotSupportedException();

        public Task<string> SaveVideoAsync(
            IFormFile file,
            string subfolder,
            string filePrefix,
            CancellationToken ct) => throw new NotSupportedException();

        public Task<string> BeginVideoChunkSessionAsync(CancellationToken ct) => throw new NotSupportedException();

        public Task<long> AppendVideoChunkAsync(
            string sessionId,
            IFormFile chunk,
            long offset,
            CancellationToken ct) => throw new NotSupportedException();

        public Task<string> FinalizeVideoChunkSessionAsync(
            string sessionId,
            string fileName,
            string contentType,
            string subfolder,
            string filePrefix,
            CancellationToken ct) => throw new NotSupportedException();

        public Task<CustomerDownloadUpload> SaveCustomerDownloadAsync(
            IFormFile file,
            string subfolder,
            string filePrefix,
            long maxBytes,
            bool allowZip,
            CancellationToken ct) => throw new NotSupportedException();

        public void DeleteIfLocal(string? url) => throw new NotSupportedException();
    }
}
