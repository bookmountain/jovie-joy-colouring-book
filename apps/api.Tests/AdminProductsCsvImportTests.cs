using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace JovieJoy.Api.Tests;

public class AdminProductsCsvImportTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AdminProductsCsvImportTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Preview_normalizes_headers_currency_booleans_lists_and_does_not_write()
    {
        var client = await _factory.CreateAdminClientAsync();
        var suffix = Guid.NewGuid().ToString("N");
        var rawSlug = $" Preview Product {suffix} ";
        var expectedSlug = $"preview-product-{suffix}";
        var collectionSlug = await _factory.SeedCollection();
        var csv = $"""
            Slug,Title,Excerpt,Product Type,Price,Currency,Available,Description,Tags,Collections,Published At
            {rawSlug},"Quoted, title","Line one
            line two",PHYSICAL,$12.34,usd,YES,First|Second,Cozy|cozy|Animals,{collectionSlug},2026-08-12T10:30:00+09:30
            """;

        var response = await PostCsv(client, csv, mode: "create", dryRun: true);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ProductCsvImportResponse>();

        Assert.NotNull(result);
        Assert.True(result!.Valid);
        Assert.True(result.DryRun);
        Assert.Equal(1, result.TotalRows);
        Assert.Equal(1, result.CreateCount);
        Assert.Equal(0, result.ImportedCount);
        Assert.Equal(expectedSlug, result.Rows.Single().Slug);
        Assert.Equal("Quoted, title", result.Rows.Single().Title);
        Assert.Equal("create", result.Rows.Single().Action);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.Products.AnyAsync(product => product.Slug == expectedSlug));
    }

    [Fact]
    public async Task Import_creates_product_with_utc_publication_and_collection_membership()
    {
        var client = await _factory.CreateAdminClientAsync();
        var slug = $"csv-create-{Guid.NewGuid():N}";
        var collectionSlug = await _factory.SeedCollection();
        var csv = "slug,title,excerpt,description,price_cents,compare_at_price_cents,available,product_type,images,tags,collections,published_at\n" +
                  $"{slug},Imported product,Imported excerpt,First|Second,1234,1599,true,physical,/uploads/products/one.png|/uploads/products/two.png,Cozy|cozy|Animals,{collectionSlug},2026-08-12T10:30:00+09:30\n";

        var response = await PostCsv(client, csv, mode: "create", dryRun: false);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ProductCsvImportResponse>();

        Assert.NotNull(result);
        Assert.True(result!.Valid);
        Assert.False(result.DryRun);
        Assert.Equal(1, result.ImportedCount);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var product = await db.Products
            .AsNoTracking()
            .Include(item => item.ProductCollections)
            .ThenInclude(link => link.Collection)
            .SingleAsync(item => item.Slug == slug);
        Assert.Equal(1234, product.PriceCents);
        Assert.Equal(1599, product.CompareAtPriceCents);
        Assert.Equal(ProductType.Physical, product.ProductType);
        Assert.Equal(["First", "Second"], product.Description);
        Assert.Equal(["Cozy", "Animals"], product.Tags);
        Assert.Equal(["/uploads/products/one.png", "/uploads/products/two.png"], product.Images);
        Assert.Single(product.Options);
        Assert.Equal("Default Title", product.Options[0].Values.Single());
        Assert.Equal(DateTimeKind.Utc, product.PublishedAt!.Value.Kind);
        Assert.Equal(new DateTime(2026, 8, 12, 1, 0, 0, DateTimeKind.Utc), product.PublishedAt);
        Assert.Contains(product.ProductCollections, link => link.Collection.Slug == collectionSlug);
    }

    [Fact]
    public async Task Import_rejects_published_digital_product_without_an_existing_pdf()
    {
        var client = await _factory.CreateAdminClientAsync();
        var slug = $"csv-digital-without-pdf-{Guid.NewGuid():N}";
        var csv = "slug,title,price_cents,product_type,published_at\n" +
                  $"{slug},Incomplete digital product,1234,digital,2026-08-12T00:00:00Z\n";

        var response = await PostCsv(client, csv, mode: "create", dryRun: false);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ProductCsvImportResponse>();
        Assert.NotNull(result);
        Assert.False(result!.Valid);
        Assert.Contains(
            result.Rows.Single().Errors,
            error => error.Contains("uploaded PDF", StringComparison.OrdinalIgnoreCase));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.Products.AnyAsync(product => product.Slug == slug));
    }

    [Fact]
    public async Task Create_mode_rejects_existing_slug_and_imports_nothing()
    {
        var client = await _factory.CreateAdminClientAsync();
        var existingSlug = $"csv-existing-{Guid.NewGuid():N}";
        var newSlug = $"csv-blocked-{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Products.Add(NewProduct(existingSlug, "Original title"));
            await db.SaveChangesAsync();
        }
        var csv = "slug,title,price_cents,product_type\n" +
                  $"{newSlug},Would be new,100,physical\n" +
                  $"{existingSlug},Must not overwrite,200,digital\n";

        var response = await PostCsv(client, csv, mode: "create", dryRun: false);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ProductCsvImportResponse>();

        Assert.NotNull(result);
        Assert.False(result!.Valid);
        Assert.Equal(0, result.ImportedCount);
        Assert.Contains(result.Rows, row => row.Slug == existingSlug && row.Action == "invalid");

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await verifyDb.Products.AnyAsync(product => product.Slug == newSlug));
        Assert.Equal("Original title", (await verifyDb.Products.SingleAsync(product => product.Slug == existingSlug)).Title);
    }

    [Fact]
    public async Task Upsert_updates_explicit_columns_preserves_omitted_fields_and_replaces_collections()
    {
        var client = await _factory.CreateAdminClientAsync();
        var slug = $"csv-upsert-{Guid.NewGuid():N}";
        var oldCollectionSlug = await _factory.SeedCollection();
        var newCollectionSlug = await _factory.SeedCollection();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var oldCollection = await db.Collections.SingleAsync(collection => collection.Slug == oldCollectionSlug);
            var product = NewProduct(slug, "Old title");
            product.Images = ["/preserved.png"];
            product.Options = [new ProductOption("Binding", ["Spiral"] )];
            product.PublishedAt = DateTime.UtcNow.AddDays(-2);
            db.Products.Add(product);
            db.ProductCollections.Add(new ProductCollection { Product = product, Collection = oldCollection });
            await db.SaveChangesAsync();
        }
        var csv = "slug,title,excerpt,price_cents,compare_at_price_cents,available,product_type,tags,collections,published_at\n" +
                  $"{slug},Updated title,Updated excerpt,2500,,no,digital,New|new,{newCollectionSlug},\n";

        var response = await PostCsv(client, csv, mode: "upsert", dryRun: false);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ProductCsvImportResponse>();

        Assert.NotNull(result);
        Assert.True(result!.Valid);
        Assert.Equal(1, result.UpdateCount);
        Assert.Equal(1, result.ImportedCount);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var updated = await verifyDb.Products
            .AsNoTracking()
            .Include(product => product.ProductCollections)
            .ThenInclude(link => link.Collection)
            .SingleAsync(product => product.Slug == slug);
        Assert.Equal("Updated title", updated.Title);
        Assert.Equal("Updated excerpt", updated.Excerpt);
        Assert.Equal(2500, updated.PriceCents);
        Assert.Null(updated.CompareAtPriceCents);
        Assert.False(updated.Available);
        Assert.Equal(ProductType.Digital, updated.ProductType);
        Assert.Equal(["/preserved.png"], updated.Images);
        Assert.Equal("Binding", updated.Options.Single().Name);
        Assert.Null(updated.PublishedAt);
        Assert.Equal([newCollectionSlug], updated.ProductCollections.Select(link => link.Collection.Slug).ToList());
    }

    [Fact]
    public async Task Upsert_removes_only_replaced_local_images_that_are_no_longer_referenced()
    {
        var client = await _factory.CreateAdminClientAsync();
        var slug = $"csv-image-cleanup-{Guid.NewGuid():N}";
        var oldUrl = $"/uploads/products/{slug}-old.png";
        var oldPath = Path.Combine(
            _factory.ContentRoot,
            oldUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(oldPath)!);
        await File.WriteAllBytesAsync(oldPath, [1, 2, 3, 4]);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var product = NewProduct(slug, "Old title");
            product.Images = [oldUrl];
            db.Products.Add(product);
            await db.SaveChangesAsync();
        }

        var csv = "slug,title,price_cents,product_type,images\n" +
                  $"{slug},Updated title,500,physical,https://cdn.shopify.com/replacement.png\n";
        var response = await PostCsv(client, csv, mode: "upsert", dryRun: false);

        response.EnsureSuccessStatusCode();
        Assert.False(File.Exists(oldPath));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Committed_upsert_stays_successful_when_post_commit_cleanup_fails_or_is_cancelled(
        bool cancelledCleanup)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"csv-post-commit-{Guid.NewGuid():N}")
            .Options;
        await using var db = new AppDbContext(options);
        var slug = $"csv-post-commit-{Guid.NewGuid():N}";
        var oldImage = $"/uploads/products/{slug}-old.png";
        var newImage = "https://cdn.shopify.com/replacement.png";
        var product = NewProduct(slug, "Before import");
        product.Images = [oldImage];
        db.Products.Add(product);
        await db.SaveChangesAsync();

        Exception cleanupError = cancelledCleanup
            ? new OperationCanceledException("Injected cleanup cancellation")
            : new DbUpdateException("Injected transient cleanup failure");
        var cleanup = new RecordingAssetCleanup(cleanupError);
        var logger = new RecordingLogger<ProductCsvImportService>();
        var importer = new ProductCsvImportService(db, cleanup, logger);
        using var csv = new MemoryStream(Encoding.UTF8.GetBytes(
            "slug,title,price_cents,product_type,images\n" +
            $"{slug},After import,600,digital,{newImage}\n"));

        var result = await importer.ImportAsync(csv, "upsert", dryRun: false, CancellationToken.None);

        Assert.True(result.Valid);
        Assert.False(result.DryRun);
        Assert.Equal(1, result.ImportedCount);
        Assert.Empty(result.Errors);
        Assert.Equal(1, cleanup.Calls);
        Assert.Equal([oldImage], cleanup.Candidates);
        Assert.False(cleanup.Token.CanBeCanceled);
        var warning = Assert.Single(logger.Entries);
        Assert.Equal(LogLevel.Warning, warning.Level);
        Assert.Same(cleanupError, warning.Exception);

        db.ChangeTracker.Clear();
        var persisted = await db.Products.AsNoTracking().SingleAsync(row => row.Slug == slug);
        Assert.Equal("After import", persisted.Title);
        Assert.Equal(600, persisted.PriceCents);
        Assert.Equal(ProductType.Digital, persisted.ProductType);
        Assert.Equal([newImage], persisted.Images);
    }

    [Fact]
    public async Task Failed_catalog_write_does_not_start_post_commit_asset_cleanup()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"csv-pre-commit-{Guid.NewGuid():N}")
            .Options;
        await using var db = new FailNextSaveDbContext(options);
        var slug = $"csv-pre-commit-{Guid.NewGuid():N}";
        var oldImage = $"/uploads/products/{slug}-old.png";
        var product = NewProduct(slug, "Before import");
        product.Images = [oldImage];
        db.Products.Add(product);
        await db.SaveChangesAsync();

        var cleanup = new RecordingAssetCleanup();
        var importer = new ProductCsvImportService(db, cleanup);
        using var csv = new MemoryStream(Encoding.UTF8.GetBytes(
            "slug,title,price_cents,product_type,images\n" +
            $"{slug},Must not persist,600,digital,https://cdn.shopify.com/replacement.png\n"));
        db.FailNextSave = true;

        var result = await importer.ImportAsync(csv, "upsert", dryRun: false, CancellationToken.None);

        Assert.False(result.Valid);
        Assert.Equal(0, result.ImportedCount);
        Assert.Contains(result.Errors, error => error.Contains("Nothing was imported", StringComparison.Ordinal));
        Assert.Equal(0, cleanup.Calls);

        db.ChangeTracker.Clear();
        var persisted = await db.Products.AsNoTracking().SingleAsync(row => row.Slug == slug);
        Assert.Equal("Before import", persisted.Title);
        Assert.Equal(500, persisted.PriceCents);
        Assert.Equal(ProductType.Physical, persisted.ProductType);
        Assert.Equal([oldImage], persisted.Images);
    }

    [Fact]
    public async Task Duplicate_rows_unknown_collections_and_row_limit_return_validation_without_writes()
    {
        var client = await _factory.CreateAdminClientAsync();
        var slug = $"csv-duplicate-{Guid.NewGuid():N}";
        var duplicateCsv = "slug,title,price_cents,product_type,collections\n" +
                           $"{slug},First,100,physical,missing-collection\n" +
                           $"{slug},Second,100,physical,missing-collection\n";

        var duplicateResponse = await PostCsv(client, duplicateCsv, mode: "upsert", dryRun: false);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, duplicateResponse.StatusCode);
        var duplicateResult = await duplicateResponse.Content.ReadFromJsonAsync<ProductCsvImportResponse>();
        Assert.NotNull(duplicateResult);
        Assert.False(duplicateResult!.Valid);
        Assert.Equal(0, duplicateResult.ImportedCount);
        Assert.All(duplicateResult.Rows, row =>
        {
            Assert.Contains(row.Errors, error => error.Contains("Duplicate slug", StringComparison.Ordinal));
            Assert.Contains(row.Errors, error => error.Contains("does not exist", StringComparison.Ordinal));
        });

        var tooManyRows = new StringBuilder("slug,title,price_cents,product_type\n");
        for (var index = 0; index <= ProductCsvImportService.MaxRows; index++)
            tooManyRows.Append($"limit-{Guid.NewGuid():N},Title,100,physical\n");
        var limitResponse = await PostCsv(client, tooManyRows.ToString(), mode: "create", dryRun: true);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, limitResponse.StatusCode);
        var limitResult = await limitResponse.Content.ReadFromJsonAsync<ProductCsvImportResponse>();
        Assert.NotNull(limitResult);
        Assert.False(limitResult!.Valid);
        Assert.Contains(limitResult.Errors, error => error.Contains("at most 1000", StringComparison.Ordinal));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.Products.AnyAsync(product => product.Slug == slug));
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://evil.example/product.png")]
    [InlineData("/uploads/../outside.png")]
    [InlineData("//evil.example/product.png")]
    public async Task Preview_rejects_images_the_storefront_cannot_render_safely(string image)
    {
        var client = await _factory.CreateAdminClientAsync();
        var slug = $"csv-image-{Guid.NewGuid():N}";
        var csv = "slug,title,price_cents,product_type,images\n" +
                  $"{slug},Bad image,100,physical,{image}\n";

        var response = await PostCsv(client, csv, mode: "create", dryRun: true);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<ProductCsvImportResponse>();

        Assert.NotNull(result);
        Assert.False(result!.Valid);
        Assert.Contains(result.Rows.Single().Errors,
            error => error.Contains("approved image host", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Formula_like_text_and_oversized_files_are_rejected_without_writes()
    {
        var client = await _factory.CreateAdminClientAsync();
        var slug = $"csv-formula-{Guid.NewGuid():N}";
        var formulaResponse = await PostCsv(
            client,
            $"slug,title,price_cents,product_type\n{slug},=1+1,100,physical\n",
            mode: "create",
            dryRun: false);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, formulaResponse.StatusCode);
        var formulaResult = await formulaResponse.Content.ReadFromJsonAsync<ProductCsvImportResponse>();
        Assert.Contains(formulaResult!.Rows.Single().Errors, error => error.Contains("spreadsheet", StringComparison.OrdinalIgnoreCase));

        using var multipart = new MultipartFormDataContent();
        var oversized = new ByteArrayContent(new byte[ProductCsvImportService.MaxFileBytes + 1]);
        oversized.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
        multipart.Add(oversized, "file", "products.csv");
        var oversizedResponse = await client.PostAsync("/api/admin/products/import", multipart);
        Assert.Equal(HttpStatusCode.BadRequest, oversizedResponse.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.Products.AnyAsync(product => product.Slug == slug));
    }

    [Fact]
    public async Task Missing_file_wrong_extension_and_invalid_mode_return_clear_client_errors()
    {
        var client = await _factory.CreateAdminClientAsync();

        using var emptyMultipart = new MultipartFormDataContent();
        var noFile = await client.PostAsync("/api/admin/products/import", emptyMultipart);
        Assert.Equal(HttpStatusCode.BadRequest, noFile.StatusCode);

        using var wrongExtension = new MultipartFormDataContent();
        wrongExtension.Add(new StringContent("slug,title,price_cents,product_type"), "file", "products.txt");
        var wrongExtensionResponse = await client.PostAsync("/api/admin/products/import", wrongExtension);
        Assert.Equal(HttpStatusCode.BadRequest, wrongExtensionResponse.StatusCode);

        var invalidModeResponse = await PostCsv(
            client,
            "slug,title,price_cents,product_type\na,A,100,physical\n",
            mode: "replace-all",
            dryRun: true);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, invalidModeResponse.StatusCode);
        var invalidMode = await invalidModeResponse.Content.ReadFromJsonAsync<ProductCsvImportResponse>();
        Assert.Contains(invalidMode!.Errors, error => error.Contains("create", StringComparison.Ordinal));
    }

    private static async Task<HttpResponseMessage> PostCsv(
        HttpClient client,
        string csv,
        string mode,
        bool dryRun)
    {
        using var multipart = new MultipartFormDataContent();
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(csv));
        file.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
        multipart.Add(file, "file", "products.csv");
        return await client.PostAsync($"/api/admin/products/import?mode={mode}&dryRun={dryRun.ToString().ToLowerInvariant()}", multipart);
    }

    private static Product NewProduct(string slug, string title) => new()
    {
        Slug = slug,
        Title = title,
        Excerpt = "Existing excerpt",
        Description = ["Existing description"],
        PriceCents = 500,
        CompareAtPriceCents = 700,
        Available = true,
        ProductType = ProductType.Physical,
        Images = [],
        Options = [new ProductOption("Format", ["Default Title"])],
        Tags = ["Existing"],
        PublishedAt = null,
    };

    private sealed class RecordingAssetCleanup(Exception? error = null) : IAssetCleanupService
    {
        public int Calls { get; private set; }
        public List<string?> Candidates { get; private set; } = [];
        public CancellationToken Token { get; private set; }

        public Task DeleteUnreferencedAsync(IEnumerable<string?> candidates, CancellationToken ct)
        {
            Calls += 1;
            Candidates = candidates.ToList();
            Token = ct;
            return error is null ? Task.CompletedTask : Task.FromException(error);
        }

        public Task<IReadOnlySet<string>> ReadReferencedLocalUrlsAsync(CancellationToken ct) =>
            Task.FromResult<IReadOnlySet<string>>(new HashSet<string>(StringComparer.Ordinal));
    }

    private sealed class RecordingLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, Exception? Exception, string Message)> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter) =>
            Entries.Add((logLevel, exception, formatter(state, exception)));
    }

    private sealed class FailNextSaveDbContext(DbContextOptions<AppDbContext> options) : AppDbContext(options)
    {
        public bool FailNextSave { get; set; }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            if (!FailNextSave) return base.SaveChangesAsync(cancellationToken);
            FailNextSave = false;
            return Task.FromException<int>(new DbUpdateException("Injected catalog write failure"));
        }
    }
}
