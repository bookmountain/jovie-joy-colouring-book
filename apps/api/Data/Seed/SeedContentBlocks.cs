using System.Text.Json;
using System.Text.Json.Nodes;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedContentBlocks
{
    private const string LegacyHeroImagePlaceholder = "/placeholders/footer-characters-desktop.png";

    public static async Task RunAsync(AppDbContext db)
    {
        var now = DateTime.UtcNow;

        var blocks = new List<ContentBlock>
        {
            new()
            {
                Key = "home.hero", Type = ContentBlockType.HomeHero, SortIndex = 0, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                {
                  "eyebrow": "New release",
                  "title": "Cozy coloring for calm days",
                  "subtext": "Hand-drawn pages designed for slow, warm moments.",
                  "ctaLabel": "Shop the cozy collection",
                  "ctaHref": "/collections/cute-comfy",
                  "image": ""
                }
                """),
            },
            new()
            {
                // Drives the homepage hero carousel. Slide images are seeded with
                // cocowyo placeholders so the storefront isn't empty on first boot —
                // admin MUST replace each via /admin/pages/home before launch.
                // The storefront uses a single image per slide with responsive CSS;
                // there is no separate mobile asset.
                Key = "home.hero.slides", Type = ContentBlockType.HomeHeroSlides, SortIndex = 0, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                {
                  "intervalMs": 5000,
                  "slides": [
                    {
                      "label": "Vinyl Sticker Packs",
                      "href": "/collections/vinyl-sticker-packs",
                      "image": "https://cocowyo.com/cdn/shop/files/sticker-laucnhing-banner-DT.png?v=1777523750&width=2000"
                    },
                    {
                      "label": "Comfy Corner Coloring Book",
                      "href": "/products/comfy-corner-coloring-book",
                      "image": "https://cocowyo.com/cdn/shop/files/Comfy-Corner-coloring-book-banner-desktop.png?v=1775562163&width=2000"
                    },
                    {
                      "label": "Spiral-bound Coloring Books",
                      "href": "/collections/spiral-bound",
                      "image": "https://cocowyo.com/cdn/shop/files/spiral-bound-banner-desktop.png?v=1776307178&width=2000"
                    },
                    {
                      "label": "Zoe&Book Coloring Community",
                      "href": "https://www.facebook.com/",
                      "image": "https://cocowyo.com/cdn/shop/files/Come-Join-Us-DESKTOP.png?v=1774414477&width=2000"
                    },
                    {
                      "label": "Free Coloring Pages",
                      "href": "/pages/comics",
                      "image": "https://cocowyo.com/cdn/shop/files/coco-wyo-free-coloring-pages.png?v=1751277856&width=1880"
                    }
                  ]
                }
                """),
            },
            new()
            {
                Key = "announcement.bar", Type = ContentBlockType.Announcement, SortIndex = 0, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                { "enabled": true, "text": "Free worldwide shipping over $50", "href": "/pages/shipping" }
                """),
            },
            new()
            {
                Key = "home.video", Type = ContentBlockType.HomeVideo, SortIndex = 0, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                {
                  "src": "https://cocowyo.com/cdn/shop/videos/c/vp/35c5461dff43486e92c79a0e5735e7a0/35c5461dff43486e92c79a0e5735e7a0.HD-1080p-7.2Mbps-42161933.mp4?v=0",
                  "youtubeHref": "https://www.youtube.com/watch?v=_9VUPq3SxOc"
                }
                """),
            },
            new()
            {
                Key = "hero.artwork.faq", Type = ContentBlockType.HeroArtwork, SortIndex = 0, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                { "image": "https://cocowyo.com/cdn/shop/files/FAQs-desktop-2.png?v=1776916849&width=1500" }
                """),
            },
            new()
            {
                Key = "hero.artwork.footer", Type = ContentBlockType.HeroArtwork, SortIndex = 1, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                { "image": "https://cocowyo.com/cdn/shop/files/Destop-footer.png?v=1777450734&width=3840" }
                """),
            },
            new()
            {
                Key = "home.intro", Type = ContentBlockType.HomeIntro, SortIndex = 0, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                {
                  "title": "Hi Friend!",
                  "body": "We craft these coloring books to offer comfort and relaxation. The smallest creative moments can ground a busy day, and these pages are designed to make that pause feel gentle and easy."
                }
                """),
            },
            new()
            {
                Key = "home.cozy-moments.header", Type = ContentBlockType.HomeCozyMomentsHeader, SortIndex = 0, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                { "heading": "Cozy Moments" }
                """),
            },
            new()
            {
                Key = "footer.contact", Type = ContentBlockType.FooterContact, SortIndex = 0, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                {
                  "customerCareLabel": "Customer Care",
                  "customerCareEmail": "hello@zoeandbook.com",
                  "licensingLabel": "Licensing Inquiries",
                  "licensingEmail": "studio@zoeandbook.com",
                  "blurb": "Drop us a note anytime:"
                }
                """),
            },
            new()
            {
                Key = "header.brand", Type = ContentBlockType.HeaderBrand, SortIndex = 0, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                { "name": "Zoe&Book", "searchPlaceholder": "Search the store" }
                """),
            },
            new()
            {
                Key = "newsletter.copy", Type = ContentBlockType.NewsletterCopy, SortIndex = 0, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                {
                  "heading": "Subscribe for Updates",
                  "ctaLabel": "Subscribe",
                  "successMessage": "Thanks for subscribing!"
                }
                """),
            },
            new()
            {
                Key = "home.row.new-release", Type = ContentBlockType.HomeProductRow, SortIndex = 0, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                { "eyebrow": "Just landed", "title": "New Release", "href": "/collections/new-release", "collectionSlug": "new-release", "itemCount": 4 }
                """),
            },
            new()
            {
                Key = "home.row.best-seller", Type = ContentBlockType.HomeProductRow, SortIndex = 1, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                { "eyebrow": "Popular products", "title": "Best Seller", "href": "/collections/frontpage", "collectionSlug": "frontpage", "itemCount": 4 }
                """),
            },
            new()
            {
                Key = "home.row.digital", Type = ContentBlockType.HomeProductRow, SortIndex = 2, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                { "eyebrow": "Digital books", "title": "Digital", "href": "/collections/digital", "collectionSlug": "digital", "itemCount": 4 }
                """),
            },
        };

        var existingKeys = await db.ContentBlocks.Select(b => b.Key).ToListAsync();
        var existingKeySet = new HashSet<string>(existingKeys, StringComparer.Ordinal);

        var missing = blocks.Where(b => !existingKeySet.Contains(b.Key)).ToList();
        if (missing.Count > 0)
        {
            db.ContentBlocks.AddRange(missing);
        }

        await HealLegacyHeroImageAsync(db);
        await BackfillEmptyHeroSlidesAsync(db, blocks);
        await MigrateLegacyHeroSlideShapeAsync(db);
        await MigrateLegacyHeroArtworkShapeAsync(db);

        await db.SaveChangesAsync();
    }

    private static async Task HealLegacyHeroImageAsync(AppDbContext db)
    {
        var hero = await db.ContentBlocks.FirstOrDefaultAsync(b => b.Key == "home.hero");
        if (hero is null) return;

        if (!hero.Data.RootElement.TryGetProperty("image", out var imageProp)) return;
        if (imageProp.ValueKind != JsonValueKind.String) return;
        if (imageProp.GetString() != LegacyHeroImagePlaceholder) return;

        var json = hero.Data.RootElement.GetRawText();
        var node = JsonNode.Parse(json) as JsonObject;
        if (node is null) return;
        node["image"] = "";

        hero.Data = JsonDocument.Parse(node.ToJsonString());
        hero.UpdatedAt = DateTime.UtcNow;
    }

    // If home.hero.slides exists but every slide image is empty (i.e. seeded by the
    // first version of HomeHeroSlides), rewrite it with the cocowyo placeholders so
    // the storefront isn't blank. Skipped if any image has been uploaded already.
    private static async Task BackfillEmptyHeroSlidesAsync(AppDbContext db, List<ContentBlock> seedBlocks)
    {
        var existing = await db.ContentBlocks.FirstOrDefaultAsync(b => b.Key == "home.hero.slides");
        if (existing is null) return;
        if (!existing.Data.RootElement.TryGetProperty("slides", out var slidesProp)) return;
        if (slidesProp.ValueKind != JsonValueKind.Array) return;

        var anyImage = false;
        foreach (var slide in slidesProp.EnumerateArray())
        {
            if (slide.TryGetProperty("image", out var im) && im.ValueKind == JsonValueKind.String && !string.IsNullOrEmpty(im.GetString())) { anyImage = true; break; }
            if (slide.TryGetProperty("desktop", out var d) && d.ValueKind == JsonValueKind.String && !string.IsNullOrEmpty(d.GetString())) { anyImage = true; break; }
            if (slide.TryGetProperty("mobile", out var m) && m.ValueKind == JsonValueKind.String && !string.IsNullOrEmpty(m.GetString())) { anyImage = true; break; }
        }
        if (anyImage) return;

        var template = seedBlocks.FirstOrDefault(b => b.Key == "home.hero.slides");
        if (template is null) return;

        existing.Data = JsonDocument.Parse(template.Data.RootElement.GetRawText());
        existing.UpdatedAt = DateTime.UtcNow;
    }

    // Rewrites legacy { desktop, mobile } slides to { image } in place.
    // Idempotent: slides that already have `image` are left alone.
    private static async Task MigrateLegacyHeroSlideShapeAsync(AppDbContext db)
    {
        var existing = await db.ContentBlocks.FirstOrDefaultAsync(b => b.Key == "home.hero.slides");
        if (existing is null) return;
        var node = JsonNode.Parse(existing.Data.RootElement.GetRawText()) as JsonObject;
        if (node is null) return;
        if (node["slides"] is not JsonArray slides) return;

        var mutated = false;
        foreach (var s in slides)
        {
            if (s is not JsonObject slide) continue;
            var image = slide["image"]?.GetValue<string>();
            if (!string.IsNullOrEmpty(image)) continue;

            var fallback = slide["desktop"]?.GetValue<string>() ?? slide["mobile"]?.GetValue<string>();
            if (string.IsNullOrEmpty(fallback)) continue;

            slide["image"] = fallback;
            slide.Remove("desktop");
            slide.Remove("mobile");
            mutated = true;
        }

        if (!mutated) return;
        existing.Data = JsonDocument.Parse(node.ToJsonString());
        existing.UpdatedAt = DateTime.UtcNow;
    }

    // HeroArtwork blocks (hero.artwork.faq, hero.artwork.footer, etc.) used to
    // carry { desktop, mobile }. Storefront now renders a single image with
    // responsive CSS, so migrate any existing rows in place: copy desktop (or
    // mobile, as a fallback) into image and drop the old keys. Idempotent.
    private static async Task MigrateLegacyHeroArtworkShapeAsync(AppDbContext db)
    {
        var rows = await db.ContentBlocks
            .Where(b => b.Type == ContentBlockType.HeroArtwork)
            .ToListAsync();

        foreach (var row in rows)
        {
            if (JsonNode.Parse(row.Data.RootElement.GetRawText()) is not JsonObject node) continue;

            var currentImage = node["image"]?.GetValue<string>();
            if (!string.IsNullOrEmpty(currentImage))
            {
                // Already on the new shape — just make sure legacy keys are gone.
                if (node.ContainsKey("desktop") || node.ContainsKey("mobile"))
                {
                    node.Remove("desktop");
                    node.Remove("mobile");
                    row.Data = JsonDocument.Parse(node.ToJsonString());
                    row.UpdatedAt = DateTime.UtcNow;
                }
                continue;
            }

            var fallback = node["desktop"]?.GetValue<string>() ?? node["mobile"]?.GetValue<string>();
            if (string.IsNullOrEmpty(fallback)) continue;

            node["image"] = fallback;
            node.Remove("desktop");
            node.Remove("mobile");
            row.Data = JsonDocument.Parse(node.ToJsonString());
            row.UpdatedAt = DateTime.UtcNow;
        }
    }
}
