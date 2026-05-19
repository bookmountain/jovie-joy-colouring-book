using System.Text.Json;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedContentBlocks
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.ContentBlocks.AnyAsync()) return;

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
                  "image": "/placeholders/footer-characters-desktop.png"
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
                { "desktop": "/placeholders/footer-characters-desktop.png", "mobile": "/placeholders/footer-characters-mobile.png" }
                """),
            },
        };

        db.ContentBlocks.AddRange(blocks);
        await db.SaveChangesAsync();
    }
}
