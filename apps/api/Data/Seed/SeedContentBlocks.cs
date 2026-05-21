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
                // Drives the homepage hero carousel. Slide images are seeded with the
                // existing cocowyo placeholders so the storefront isn't empty on first
                // boot — admin MUST replace each via /admin/pages/home before launch.
                // See project_cocowyo_cleanup memory for the full asset replacement list.
                Key = "home.hero.slides", Type = ContentBlockType.HomeHeroSlides, SortIndex = 0, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                {
                  "intervalMs": 5000,
                  "slides": [
                    {
                      "label": "Vinyl Sticker Packs",
                      "href": "/collections/vinyl-sticker-packs",
                      "desktop": "https://cocowyo.com/cdn/shop/files/sticker-laucnhing-banner-DT.png?v=1777523750&width=2000",
                      "mobile": "https://cocowyo.com/cdn/shop/files/sticker-laucnhing-banner-MB.png?v=1777523749&width=750"
                    },
                    {
                      "label": "Comfy Corner Coloring Book",
                      "href": "/products/comfy-corner-coloring-book",
                      "desktop": "https://cocowyo.com/cdn/shop/files/Comfy-Corner-coloring-book-banner-desktop.png?v=1775562163&width=2000",
                      "mobile": "https://cocowyo.com/cdn/shop/files/comfy-corner-banner-mobile..png?v=1776313803&width=750"
                    },
                    {
                      "label": "Spiral-bound Coloring Books",
                      "href": "/collections/spiral-bound",
                      "desktop": "https://cocowyo.com/cdn/shop/files/spiral-bound-banner-desktop.png?v=1776307178&width=2000",
                      "mobile": "https://cocowyo.com/cdn/shop/files/spiral-bound-banner-mobile..png?v=1776313803&width=750"
                    },
                    {
                      "label": "Zoe&Book Coloring Community",
                      "href": "https://www.facebook.com/",
                      "desktop": "https://cocowyo.com/cdn/shop/files/Come-Join-Us-DESKTOP.png?v=1774414477&width=2000",
                      "mobile": "https://cocowyo.com/cdn/shop/files/community-banner-mobile..png?v=1776313802&width=750"
                    },
                    {
                      "label": "Free Coloring Pages",
                      "href": "/pages/comics",
                      "desktop": "https://cocowyo.com/cdn/shop/files/coco-wyo-free-coloring-pages.png?v=1751277856&width=1880",
                      "mobile": "https://cocowyo.com/cdn/shop/files/freebies-banner-mobile..png?v=1776313802&width=750"
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
                {
                  "desktop": "https://cocowyo.com/cdn/shop/files/FAQs-desktop-2.png?v=1776916849&width=1500",
                  "mobile":  "https://cocowyo.com/cdn/shop/files/FAQs-mobile.png?v=1776916631&width=750"
                }
                """),
            },
            new()
            {
                Key = "hero.artwork.footer", Type = ContentBlockType.HeroArtwork, SortIndex = 1, UpdatedAt = now,
                Data = JsonDocument.Parse("""
                { "desktop": "https://cocowyo.com/cdn/shop/files/Destop-footer.png?v=1777450734&width=3840", "mobile": "/placeholders/footer-characters-mobile.png" }
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
            if (slide.TryGetProperty("desktop", out var d) && d.ValueKind == JsonValueKind.String && !string.IsNullOrEmpty(d.GetString())) { anyImage = true; break; }
            if (slide.TryGetProperty("mobile", out var m) && m.ValueKind == JsonValueKind.String && !string.IsNullOrEmpty(m.GetString())) { anyImage = true; break; }
        }
        if (anyImage) return;

        var template = seedBlocks.FirstOrDefault(b => b.Key == "home.hero.slides");
        if (template is null) return;

        existing.Data = JsonDocument.Parse(template.Data.RootElement.GetRawText());
        existing.UpdatedAt = DateTime.UtcNow;
    }
}
