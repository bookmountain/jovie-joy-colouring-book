using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedBlogs
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.BlogCategories.AnyAsync()) return;

        var categories = new List<BlogCategory>
        {
            new() { Slug = "htc", Title = "How to Color",
                    Excerpt = "Step-by-step coloring tips to relax, explore, and bring favorite pages to life.",
                    Image = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-friends-coloring-book_1e6f3fa6-a8d0-41b9-92f8-975d68ae5adf.png?v=1775734470",
                    SortIndex = 0 },
            new() { Slug = "coloring-book-guide", Title = "Tools & Tips",
                    Excerpt = "Helpful guides for choosing and using tools that match your style.",
                    Image = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-comfy-patterns-coloring-book_14.png?v=1775734214",
                    SortIndex = 1 },
            new() { Slug = "color-world", Title = "Color World",
                    Excerpt = "Explore color meaning and how palettes shape a coloring mood.",
                    Image = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-girl-moments-coloring-book-vol-2.png?v=1775731706",
                    SortIndex = 2 },
            new() { Slug = "diy", Title = "Lifestyle & DIY",
                    Excerpt = "DIY projects, cozy hobbies, and small creative rituals.",
                    Image = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-little-corner-coloring-book_291097bb-8c81-4611-aa8e-c9489d12a966.png?v=1775734428",
                    SortIndex = 3 },
            new() { Slug = "product-guide", Title = "Product Guide",
                    Excerpt = "Friendly guides to collections, formats, and favorite titles.",
                    Image = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/little-cuddles-spiral-and-sticky-set.png?v=1772695880",
                    SortIndex = 4 },
        };
        db.BlogCategories.AddRange(categories);
        await db.SaveChangesAsync();

        db.Articles.AddRange(
            new Article
            {
                Slug = "how-to-color-cozy-scenes", BlogSlug = "htc",
                Title = "Coloring Cozy Scenes",
                Excerpt = "A gentle guide to building warm palettes and soft contrast.",
                Image = categories[0].Image,
                Body = new List<string>
                {
                    "Start with a small palette and repeat colors across the page so the scene feels connected.",
                    "Use darker tones near shelves, corners, and small details to make the cozy shapes stand out.",
                },
                SortIndex = 0,
            },
            new Article
            {
                Slug = "choosing-markers-for-bold-pages", BlogSlug = "coloring-book-guide",
                Title = "Choosing Markers for Bold Pages",
                Excerpt = "Simple tips for matching tools to bold and easy coloring pages.",
                Image = categories[1].Image,
                Body = new List<string>
                {
                    "Bold pages work well with larger marker tips, especially when the art has broad enclosed shapes.",
                    "Place a protective sheet behind the page when testing saturated colors.",
                },
                SortIndex = 0,
            },
            new Article
            {
                Slug = "soft-color-palettes", BlogSlug = "color-world",
                Title = "Soft Color Palettes for Slow Coloring",
                Excerpt = "Build calm palettes with muted accents and gentle contrast.",
                Image = categories[2].Image,
                Body = new List<string>
                {
                    "Soft palettes often use one warm neutral, one grounding dark, and two playful accent colors.",
                    "Try repeating the accent in small details before filling large shapes.",
                },
                SortIndex = 0,
            }
        );
        await db.SaveChangesAsync();
    }
}
