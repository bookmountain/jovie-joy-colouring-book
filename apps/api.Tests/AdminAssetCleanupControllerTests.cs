using System.Net;
using System.Net.Http.Json;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminAssetCleanupControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AdminAssetCleanupControllerTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Replacing_images_deletes_orphans_but_preserves_cross_entity_references()
    {
        var client = await _factory.CreateAdminClientAsync();
        var sharedImage = CreateUpload("cleanup", $"shared-{Guid.NewGuid():N}.png");
        var replacementImage = CreateUpload("cleanup", $"replacement-{Guid.NewGuid():N}.png");

        var galleryCreate = await client.PostAsJsonAsync("/api/admin/gallery", new
        {
            src = sharedImage,
            alt = "Gallery",
            sortIndex = 0,
        });
        galleryCreate.EnsureSuccessStatusCode();
        var gallery = await galleryCreate.Content.ReadFromJsonAsync<GalleryImageDto>();

        var aboutCreate = await client.PostAsJsonAsync("/api/admin/about", new
        {
            title = "About",
            body = Array.Empty<string>(),
            image = sharedImage,
            alt = "About",
            background = "cream",
            sortIndex = 0,
        });
        aboutCreate.EnsureSuccessStatusCode();
        var about = await aboutCreate.Content.ReadFromJsonAsync<AboutSectionDto>();

        var replaceGallery = await client.PutAsJsonAsync($"/api/admin/gallery/{gallery!.Id}", new
        {
            src = replacementImage,
            alt = "Gallery replacement",
            sortIndex = 0,
        });
        replaceGallery.EnsureSuccessStatusCode();
        Assert.True(File.Exists(ToAbsolute(sharedImage)));
        Assert.True(File.Exists(ToAbsolute(replacementImage)));

        var clearAbout = await client.PutAsJsonAsync($"/api/admin/about/{about!.Id}", new
        {
            title = "About",
            body = Array.Empty<string>(),
            image = "",
            alt = "",
            background = "cream",
            sortIndex = 0,
        });
        clearAbout.EnsureSuccessStatusCode();
        Assert.False(File.Exists(ToAbsolute(sharedImage)));

        var clearGallery = await client.PutAsJsonAsync($"/api/admin/gallery/{gallery.Id}", new
        {
            src = "",
            alt = "Gallery replacement",
            sortIndex = 0,
        });
        clearGallery.EnsureSuccessStatusCode();
        Assert.False(File.Exists(ToAbsolute(replacementImage)));
    }

    [Fact]
    public async Task Content_updates_and_parent_cascades_cleanup_nested_assets_reference_aware()
    {
        var client = await _factory.CreateAdminClientAsync();
        var sharedImage = CreateUpload("cleanup", $"cascade-shared-{Guid.NewGuid():N}.png");
        var contentReplacement = CreateUpload("cleanup", $"content-replacement-{Guid.NewGuid():N}.png");
        var articleOnlyImage = CreateUpload("cleanup", $"article-only-{Guid.NewGuid():N}.png");
        var comicOnlyImage = CreateUpload("cleanup", $"comic-only-{Guid.NewGuid():N}.png");
        var contentKey = $"cleanup.block.{Guid.NewGuid():N}";

        (await client.PutAsJsonAsync($"/api/admin/content/{contentKey}", new
        {
            type = "HomeVideo",
            data = new
            {
                hero = new { src = sharedImage },
                slides = new[] { new { image = sharedImage } },
            },
            sortIndex = 0,
        })).EnsureSuccessStatusCode();

        var categorySlug = $"cleanup-category-{Guid.NewGuid():N}";
        (await client.PostAsJsonAsync("/api/admin/blogs", new
        {
            slug = categorySlug,
            title = "Cleanup category",
            excerpt = "",
            image = sharedImage,
            sortIndex = 0,
        })).EnsureSuccessStatusCode();
        var articleSlug = $"cleanup-article-{Guid.NewGuid():N}";
        (await client.PostAsJsonAsync($"/api/admin/blogs/{categorySlug}/articles", new
        {
            slug = articleSlug,
            title = "Cleanup article",
            excerpt = "",
            image = articleOnlyImage,
            body = Array.Empty<string>(),
            sortIndex = 0,
        })).EnsureSuccessStatusCode();

        var worldCreate = await client.PostAsJsonAsync("/api/admin/comics", new
        {
            title = "Cleanup world",
            sortIndex = 0,
        });
        worldCreate.EnsureSuccessStatusCode();
        var world = await worldCreate.Content.ReadFromJsonAsync<ComicWorldDto>();
        (await client.PostAsJsonAsync($"/api/admin/comics/{world!.Id}/comics", new
        {
            title = "Cleanup comic",
            description = "",
            hasDownload = false,
            images = new[]
            {
                new { src = sharedImage, alt = "Shared" },
                new { src = comicOnlyImage, alt = "Comic only" },
            },
            sortIndex = 0,
        })).EnsureSuccessStatusCode();

        (await client.PutAsJsonAsync($"/api/admin/content/{contentKey}", new
        {
            type = "HomeVideo",
            data = new { nested = new { image = contentReplacement } },
            sortIndex = 0,
        })).EnsureSuccessStatusCode();
        Assert.True(File.Exists(ToAbsolute(sharedImage)));

        var deleteCategory = await client.DeleteAsync($"/api/admin/blogs/{categorySlug}");
        Assert.Equal(HttpStatusCode.NoContent, deleteCategory.StatusCode);
        Assert.False(File.Exists(ToAbsolute(articleOnlyImage)));
        Assert.True(File.Exists(ToAbsolute(sharedImage)));

        var deleteWorld = await client.DeleteAsync($"/api/admin/comics/{world.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteWorld.StatusCode);
        Assert.False(File.Exists(ToAbsolute(comicOnlyImage)));
        Assert.False(File.Exists(ToAbsolute(sharedImage)));

        var deleteContent = await client.DeleteAsync($"/api/admin/content/{contentKey}");
        Assert.Equal(HttpStatusCode.NoContent, deleteContent.StatusCode);
        Assert.False(File.Exists(ToAbsolute(contentReplacement)));
    }

    [Fact]
    public async Task Upload_hrefs_across_every_CMS_owner_are_treated_as_live_references()
    {
        var suffix = Guid.NewGuid().ToString("N");
        var sourceHref = CreateUpload("cleanup", $"source-href-{suffix}.pdf");
        var navigationHref = CreateUpload("cleanup", $"navigation-href-{suffix}.pdf");
        var footerHref = CreateUpload("cleanup", $"footer-href-{suffix}.pdf");
        var socialHref = CreateUpload("cleanup", $"social-href-{suffix}.pdf");
        var featuredHref = CreateUpload("cleanup", $"featured-href-{suffix}.pdf");
        var faqHref = CreateUpload("cleanup", $"faq-href-{suffix}.pdf");
        var candidates = new[]
        {
            sourceHref, navigationHref, footerHref, socialHref, featuredHref, faqHref,
        };

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var product = new Product
        {
            Slug = $"cleanup-href-product-{suffix}",
            Title = "Cleanup href product",
            Excerpt = "Cleanup",
            Description = [],
            PriceCents = 100,
            Available = true,
            ProductType = ProductType.Physical,
            Images = [],
            Options = [new ProductOption("Format", ["Default Title"])],
            SourceLinks = [new SourceLink("Download", sourceHref, null, null)],
            Tags = [],
        };
        var navigation = new NavLink
        {
            Label = $"Cleanup navigation {suffix}",
            Href = navigationHref,
            SortIndex = 1000,
        };
        var footer = new FooterLink
        {
            GroupKey = $"cleanup-{suffix}",
            GroupTitle = "Cleanup",
            Label = "Download",
            Href = footerHref,
            SortIndex = 0,
        };
        var social = new SocialLink
        {
            Label = $"Cleanup-{suffix[..12]}",
            Href = socialHref,
            SortIndex = 1000,
        };
        var featured = new FeaturedOnLink
        {
            Slug = $"cleanup-{suffix}",
            Label = "Cleanup",
            Href = featuredHref,
            Image = "",
            Alt = "",
            SortIndex = 1000,
        };
        var faq = new Faq
        {
            Slug = $"cleanup-{suffix}",
            Question = "Cleanup?",
            Answer = "Cleanup.",
            Links = [new FaqLink("Download", faqHref)],
            SortIndex = 1000,
        };
        db.AddRange(product, navigation, footer, social, featured, faq);
        await db.SaveChangesAsync();

        var cleanup = scope.ServiceProvider.GetRequiredService<IAssetCleanupService>();
        await cleanup.DeleteUnreferencedAsync(candidates, CancellationToken.None);
        Assert.All(candidates, candidate => Assert.True(File.Exists(ToAbsolute(candidate))));

        db.RemoveRange(product, navigation, footer, social, featured, faq);
        await db.SaveChangesAsync();
        await cleanup.DeleteUnreferencedAsync(candidates, CancellationToken.None);
        Assert.All(candidates, candidate => Assert.False(File.Exists(ToAbsolute(candidate))));
    }

    [Fact]
    public async Task Removing_each_href_owner_submits_its_old_upload_for_cleanup()
    {
        var client = await _factory.CreateAdminClientAsync();
        var suffix = Guid.NewGuid().ToString("N");
        var sourceHref = CreateUpload("cleanup", $"remove-source-{suffix}.pdf");
        var navigationHref = CreateUpload("cleanup", $"remove-navigation-{suffix}.pdf");
        var footerHref = CreateUpload("cleanup", $"remove-footer-{suffix}.pdf");
        var socialHref = CreateUpload("cleanup", $"remove-social-{suffix}.pdf");
        var featuredHref = CreateUpload("cleanup", $"remove-featured-{suffix}.pdf");
        var faqHref = CreateUpload("cleanup", $"remove-faq-{suffix}.pdf");
        string productSlug;
        Guid navigationId;
        Guid footerId;
        string socialLabel;
        string featuredSlug;
        string faqSlug;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            productSlug = $"cleanup-remove-product-{suffix}";
            var product = new Product
            {
                Slug = productSlug,
                Title = "Cleanup remove product",
                Excerpt = "Cleanup",
                Description = [],
                PriceCents = 100,
                Available = true,
                ProductType = ProductType.Physical,
                Images = [],
                Options = [new ProductOption("Format", ["Default Title"])],
                SourceLinks = [new SourceLink("Download", sourceHref, null, null)],
                Tags = [],
            };
            var navigation = new NavLink
            {
                Label = $"Cleanup remove navigation {suffix}",
                Href = navigationHref,
                SortIndex = 2000,
            };
            var navigationKeep = new NavLink
            {
                Label = $"Cleanup keep navigation {suffix}",
                Href = "/",
                SortIndex = 2001,
            };
            var footer = new FooterLink
            {
                GroupKey = $"cleanup-remove-{suffix}",
                GroupTitle = "Cleanup",
                Label = "Download",
                Href = footerHref,
                SortIndex = 0,
            };
            socialLabel = $"CleanupRemove-{suffix[..12]}";
            var social = new SocialLink
            {
                Label = socialLabel,
                Href = socialHref,
                SortIndex = 2000,
            };
            featuredSlug = $"cleanup-remove-{suffix}";
            var featured = new FeaturedOnLink
            {
                Slug = featuredSlug,
                Label = "Cleanup",
                Href = featuredHref,
                Image = "",
                Alt = "",
                SortIndex = 2000,
            };
            faqSlug = $"cleanup-remove-{suffix}";
            var faq = new Faq
            {
                Slug = faqSlug,
                Question = "Cleanup?",
                Answer = "Cleanup.",
                Links = [new FaqLink("Download", faqHref)],
                SortIndex = 2000,
            };
            db.AddRange(product, navigation, navigationKeep, footer, social, featured, faq);
            await db.SaveChangesAsync();
            navigationId = navigation.Id;
            footerId = footer.Id;
        }

        (await client.DeleteAsync($"/api/admin/products/{productSlug}")).EnsureSuccessStatusCode();
        Assert.False(File.Exists(ToAbsolute(sourceHref)));

        var currentNavigation = await client.GetFromJsonAsync<AdminNavigationResponse>("/api/admin/navigation");
        Assert.NotNull(currentNavigation);
        var navigationReplace = await client.PutAsJsonAsync("/api/admin/navigation", new
        {
            items = currentNavigation!.Items.Where(item => item.Id != navigationId).ToList(),
            expectedRevision = currentNavigation.Revision,
        });
        navigationReplace.EnsureSuccessStatusCode();
        Assert.False(File.Exists(ToAbsolute(navigationHref)));

        (await client.DeleteAsync($"/api/admin/footer-links/{footerId}")).EnsureSuccessStatusCode();
        Assert.False(File.Exists(ToAbsolute(footerHref)));

        (await client.DeleteAsync($"/api/admin/social-links/{Uri.EscapeDataString(socialLabel)}")).EnsureSuccessStatusCode();
        Assert.False(File.Exists(ToAbsolute(socialHref)));

        (await client.DeleteAsync($"/api/admin/featured-on/{featuredSlug}")).EnsureSuccessStatusCode();
        Assert.False(File.Exists(ToAbsolute(featuredHref)));

        (await client.DeleteAsync($"/api/admin/faqs/{faqSlug}")).EnsureSuccessStatusCode();
        Assert.False(File.Exists(ToAbsolute(faqHref)));
    }

    [Fact]
    public async Task Cleanup_failure_is_best_effort_and_does_not_escape_after_a_committed_mutation()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var uploads = new ThrowingDeleteUploadService();
        var logger = new RecordingLogger<AssetCleanupService>();
        var cleanup = new AssetCleanupService(db, uploads, logger);

        await cleanup.DeleteUnreferencedAsync(
            [$"/uploads/cleanup/orphan-{Guid.NewGuid():N}.png"],
            CancellationToken.None);

        Assert.Equal(1, uploads.DeleteCalls);
        var warning = Assert.Single(logger.Entries);
        Assert.Equal(LogLevel.Warning, warning.Level);
        Assert.IsType<IOException>(warning.Exception);
    }

    private string CreateUpload(string folder, string fileName)
    {
        var relative = $"/uploads/{folder}/{fileName}";
        var absolute = ToAbsolute(relative);
        Directory.CreateDirectory(Path.GetDirectoryName(absolute)!);
        File.WriteAllText(absolute, "test upload sentinel");
        return relative;
    }

    private string ToAbsolute(string relative) =>
        Path.Combine(
            _factory.ContentRoot,
            relative.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

    private sealed class ThrowingDeleteUploadService : IUploadService
    {
        public int DeleteCalls { get; private set; }

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

        public void DeleteIfLocal(string? url)
        {
            DeleteCalls++;
            throw new IOException("Injected storage cleanup failure");
        }
    }

    private sealed class RecordingLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, Exception? Exception)> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter) => Entries.Add((logLevel, exception));
    }
}
