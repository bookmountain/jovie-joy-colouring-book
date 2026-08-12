using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Infrastructure;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;

namespace JovieJoy.Api.Tests;

public sealed class OrphanUploadSweeperTests : IDisposable
{
    private readonly string _contentRoot = Path.Combine(
        Path.GetTempPath(),
        $"jovie-joy-orphan-sweep-tests-{Guid.NewGuid():N}");

    [Fact]
    public async Task Sweep_deletes_only_old_unreferenced_files_and_preserves_live_or_recent_files()
    {
        Directory.CreateDirectory(_contentRoot);
        await using var db = CreateContext();
        var live = WriteUpload("products/live.png", old: true);
        var oldOrphan = WriteUpload("general/abandoned.png", old: true);
        var recentOrphan = WriteUpload("general/in-progress.png", old: false);
        db.Products.Add(ProductWithImage(live));
        await db.SaveChangesAsync();

        var result = await CreateSweeper(db).SweepAsync(TimeSpan.FromHours(24), CancellationToken.None);

        Assert.Equal(3, result.FilesScanned);
        Assert.Equal(1, result.FilesDeleted);
        Assert.Equal(2, result.FilesPreserved);
        Assert.True(File.Exists(Absolute(live)));
        Assert.False(File.Exists(Absolute(oldOrphan)));
        Assert.True(File.Exists(Absolute(recentOrphan)));
    }

    [Fact]
    public async Task Sweep_uses_the_complete_CMS_reference_inventory()
    {
        Directory.CreateDirectory(_contentRoot);
        await using var db = CreateContext();
        var productImage = WriteUpload("refs/product.png", old: true);
        var productPdf = WriteUpload("refs/product.pdf", old: true);
        var purchasedPdf = WriteUpload("refs/purchased-product.pdf", old: true);
        var sourceHref = WriteUpload("refs/source.pdf", old: true);
        var collection = WriteUpload("refs/collection.png", old: true);
        var about = WriteUpload("refs/about.png", old: true);
        var blog = WriteUpload("refs/blog.png", old: true);
        var article = WriteUpload("refs/article.png", old: true);
        var gallery = WriteUpload("refs/gallery.png", old: true);
        var featuredImage = WriteUpload("refs/featured.png", old: true);
        var featuredHref = WriteUpload("refs/featured.pdf", old: true);
        var freebieCover = WriteUpload("refs/freebie.png", old: true);
        var freebieFile = WriteUpload("refs/freebie.pdf", old: true);
        var comic = WriteUpload("refs/comic.png", old: true);
        var navigation = WriteUpload("refs/navigation.pdf", old: true);
        var footer = WriteUpload("refs/footer.pdf", old: true);
        var social = WriteUpload("refs/social.pdf", old: true);
        var faq = WriteUpload("refs/faq.pdf", old: true);
        var content = WriteUpload("refs/content.png", old: true);

        var product = ProductWithImage(productImage);
        product.PdfPath = productPdf;
        product.SourceLinks = [new SourceLink("Source", sourceHref, null, null)];
        var order = new Order
        {
            Email = "sweep@example.com",
            Status = OrderStatus.Paid,
            Currency = "usd",
            SubtotalCents = 100,
            TotalCents = 100,
        };
        var orderItem = new OrderItem
        {
            Order = order,
            ProductSlug = product.Slug,
            TitleAtPurchase = product.Title,
            UnitPriceCents = 100,
            Quantity = 1,
            DigitalFilePathAtPurchase = purchasedPdf,
        };
        var downloadGrant = new ProductDownloadGrant
        {
            Order = order,
            OrderItem = orderItem,
            Product = product,
            FilePath = purchasedPdf,
            ProductSlug = product.Slug,
            TitleAtPurchase = product.Title,
            Token = Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddDays(1),
        };
        var blogCategory = new BlogCategory
        {
            Slug = "sweep-blog",
            Title = "Blog",
            Excerpt = "",
            Image = blog,
        };
        db.AddRange(
            product,
            downloadGrant,
            new Collection { Slug = "sweep-collection", Title = "Collection", Excerpt = "", HeroImage = collection },
            new AboutSection { Title = "About", Body = [], Image = about, Alt = "", Background = "", SortIndex = 0 },
            blogCategory,
            new Article { Slug = "sweep-article", BlogSlug = blogCategory.Slug, Blog = blogCategory, Title = "Article", Excerpt = "", Image = article, Body = [] },
            new GalleryImage { Src = gallery, Alt = "", SortIndex = 0 },
            new FeaturedOnLink { Slug = "sweep-featured", Label = "Featured", Image = featuredImage, Href = featuredHref, Alt = "" },
            new Freebie { Slug = "sweep-freebie", Title = "Freebie", Excerpt = "", CoverImage = freebieCover, FilePath = freebieFile },
            new ComicWorld
            {
                Title = "World",
                Comics = [new Comic { Title = "Comic", Description = "", Images = [new ComicImage(comic, "")], SortIndex = 0 }],
            },
            new NavLink { Label = "Nav", Href = navigation, SortIndex = 0 },
            new FooterLink { GroupKey = "group", GroupTitle = "Group", Label = "Footer", Href = footer, SortIndex = 0 },
            new SocialLink { Label = "SweepSocial", Href = social, SortIndex = 0 },
            new Faq { Slug = "sweep-faq", Question = "Question", Answer = "Answer", Links = [new FaqLink("File", faq)] },
            new ContentBlock
            {
                Key = "sweep.content",
                Type = ContentBlockType.HomeIntro,
                Data = System.Text.Json.JsonDocument.Parse($$"""{ "nested": { "image": "{{content}}" } }"""),
            });
        await db.SaveChangesAsync();

        var result = await CreateSweeper(db).SweepAsync(TimeSpan.FromHours(24), CancellationToken.None);

        Assert.Equal(19, result.FilesScanned);
        Assert.Equal(0, result.FilesDeleted);
        Assert.Equal(19, result.FilesPreserved);
    }

    [Fact]
    public async Task Sweep_fails_closed_when_the_reference_inventory_cannot_be_read()
    {
        Directory.CreateDirectory(_contentRoot);
        await using var db = CreateContext();
        var orphan = WriteUpload("general/keep-on-db-error.png", old: true);
        var environment = new TestEnvironment(_contentRoot);
        var uploadService = new UploadService(environment, NullLogger<UploadService>.Instance);
        var cleanup = new ThrowingReferenceCleanup();
        var sweeper = new OrphanUploadSweeper(db, environment, cleanup, uploadService, NullLogger<OrphanUploadSweeper>.Instance);

        var result = await sweeper.SweepAsync(TimeSpan.FromHours(24), CancellationToken.None);

        Assert.Equal(new OrphanUploadSweepResult(0, 0, 0), result);
        Assert.True(File.Exists(Absolute(orphan)));
    }

    [Fact]
    public async Task Sweep_preserves_only_live_paid_entitlements_and_recent_pending_checkouts()
    {
        Directory.CreateDirectory(_contentRoot);
        await using var db = CreateContext();
        var activeGrantPath = WriteUpload("paid/active.pdf", old: true);
        var expiredGrantPath = WriteUpload("paid/expired.pdf", old: true);
        var recentPendingPath = WriteUpload("paid/recent-pending.pdf", old: true);
        var stalePendingPath = WriteUpload("paid/stale-pending.pdf", old: true);

        var activePaid = OrderWithSnapshot(activeGrantPath, OrderStatus.Paid, DateTime.UtcNow.AddDays(-2));
        activePaid.DownloadGrants.Add(GrantFor(activePaid, activeGrantPath, DateTime.UtcNow.AddDays(1)));
        var expiredPaid = OrderWithSnapshot(expiredGrantPath, OrderStatus.Paid, DateTime.UtcNow.AddDays(-40));
        expiredPaid.DownloadGrants.Add(GrantFor(expiredPaid, expiredGrantPath, DateTime.UtcNow.AddMinutes(-1)));
        var recentPending = OrderWithSnapshot(recentPendingPath, OrderStatus.Pending, DateTime.UtcNow.AddDays(-1));
        var stalePending = OrderWithSnapshot(
            stalePendingPath,
            OrderStatus.Pending,
            DateTime.UtcNow - TimeSpan.FromDays(30) - TimeSpan.FromHours(1));
        db.Orders.AddRange(activePaid, expiredPaid, recentPending, stalePending);
        await db.SaveChangesAsync();

        var result = await CreateSweeper(db).SweepAsync(TimeSpan.FromHours(24), CancellationToken.None);

        Assert.Equal(4, result.FilesScanned);
        Assert.Equal(2, result.FilesDeleted);
        Assert.True(File.Exists(Absolute(activeGrantPath)));
        Assert.True(File.Exists(Absolute(recentPendingPath)));
        Assert.False(File.Exists(Absolute(expiredGrantPath)));
        Assert.False(File.Exists(Absolute(stalePendingPath)));
        Assert.Equal(OrderStatus.Pending, recentPending.Status);
        Assert.Equal(OrderStatus.Failed, stalePending.Status);
    }

    [Fact]
    public async Task Sweep_rejects_a_negative_age_without_touching_files()
    {
        Directory.CreateDirectory(_contentRoot);
        await using var db = CreateContext();
        var orphan = WriteUpload("general/negative-age.png", old: true);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() =>
            CreateSweeper(db).SweepAsync(TimeSpan.FromSeconds(-1), CancellationToken.None));

        Assert.True(File.Exists(Absolute(orphan)));
    }

    [Fact]
    public async Task Sweep_waits_for_an_active_admin_mutation_before_reading_references_or_deleting()
    {
        Directory.CreateDirectory(_contentRoot);
        await using var db = CreateContext();
        var orphan = WriteUpload("general/wait-for-save.png", old: true);
        var mutationEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var releaseMutation = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var middleware = new AdminMutationLockMiddleware(async _ =>
        {
            mutationEntered.SetResult();
            await releaseMutation.Task;
        });
        var context = new DefaultHttpContext();
        context.Request.Method = HttpMethods.Post;
        context.Request.Path = "/api/admin/products/example";
        var mutation = middleware.InvokeAsync(context, db);
        await mutationEntered.Task.WaitAsync(TimeSpan.FromSeconds(2));

        var sweep = CreateSweeper(db).SweepAsync(TimeSpan.FromHours(24), CancellationToken.None);
        try
        {
            await Task.Delay(50);
            Assert.False(sweep.IsCompleted);
            Assert.True(File.Exists(Absolute(orphan)));
        }
        finally
        {
            releaseMutation.TrySetResult();
        }

        await mutation;
        var result = await sweep.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.Equal(1, result.FilesDeleted);
        Assert.False(File.Exists(Absolute(orphan)));
    }

    public void Dispose()
    {
        if (Directory.Exists(_contentRoot)) Directory.Delete(_contentRoot, recursive: true);
    }

    private AppDbContext CreateContext() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"orphan-sweep-{Guid.NewGuid():N}")
            .Options);

    private OrphanUploadSweeper CreateSweeper(AppDbContext db)
    {
        var environment = new TestEnvironment(_contentRoot);
        var uploadService = new UploadService(environment, NullLogger<UploadService>.Instance);
        var cleanup = new AssetCleanupService(db, uploadService, NullLogger<AssetCleanupService>.Instance);
        return new OrphanUploadSweeper(db, environment, cleanup, uploadService, NullLogger<OrphanUploadSweeper>.Instance);
    }

    private static Order OrderWithSnapshot(string path, OrderStatus status, DateTime createdAt)
    {
        var order = new Order
        {
            Email = $"{Guid.NewGuid():N}@example.com",
            Status = status,
            Currency = "usd",
            SubtotalCents = 100,
            TotalCents = 100,
            CreatedAt = createdAt,
        };
        order.Items.Add(new OrderItem
        {
            Order = order,
            ProductSlug = $"snapshot-{Guid.NewGuid():N}",
            TitleAtPurchase = "Snapshot",
            UnitPriceCents = 100,
            Quantity = 1,
            DigitalFilePathAtPurchase = path,
        });
        return order;
    }

    private static ProductDownloadGrant GrantFor(Order order, string path, DateTime expiresAt) => new()
    {
        Order = order,
        OrderItem = order.Items.Single(),
        FilePath = path,
        ProductSlug = order.Items.Single().ProductSlug,
        TitleAtPurchase = order.Items.Single().TitleAtPurchase,
        Token = Guid.NewGuid().ToString("N"),
        ExpiresAt = expiresAt,
    };

    private string WriteUpload(string relative, bool old)
    {
        var localUrl = "/uploads/" + relative.Replace(Path.DirectorySeparatorChar, '/');
        var absolute = Absolute(localUrl);
        Directory.CreateDirectory(Path.GetDirectoryName(absolute)!);
        File.WriteAllText(absolute, "test upload sentinel");
        File.SetLastWriteTimeUtc(absolute, old ? DateTime.UtcNow.AddDays(-2) : DateTime.UtcNow);
        return localUrl;
    }

    private string Absolute(string localUrl) => Path.Combine(
        _contentRoot,
        localUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

    private static Product ProductWithImage(string image) => new()
    {
        Slug = $"sweep-product-{Guid.NewGuid():N}",
        Title = "Sweep product",
        Excerpt = "Sweep",
        Description = [],
        PriceCents = 100,
        ProductType = ProductType.Physical,
        Images = [image],
        Options = [new ProductOption("Format", ["Default Title"])],
        Tags = [],
    };

    private sealed class ThrowingReferenceCleanup : IAssetCleanupService
    {
        public Task DeleteUnreferencedAsync(IEnumerable<string?> candidates, CancellationToken ct) =>
            Task.CompletedTask;

        public Task<IReadOnlySet<string>> ReadReferencedLocalUrlsAsync(CancellationToken ct) =>
            Task.FromException<IReadOnlySet<string>>(new DbUpdateException("Injected reference read failure"));
    }

    private sealed class TestEnvironment(string contentRoot) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "JovieJoy.Api.Tests";
        public string WebRootPath { get; set; } = contentRoot;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string EnvironmentName { get; set; } = "Test";
        public string ContentRootPath { get; set; } = contentRoot;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
