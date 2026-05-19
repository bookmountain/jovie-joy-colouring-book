using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedFeaturedOn
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.FeaturedOnLinks.AnyAsync()) return;

        db.FeaturedOnLinks.AddRange(
            new FeaturedOnLink { Slug = "penguin", Label = "Penguin Random House",
                Href = "https://www.penguinrandomhouse.com/",
                Image = "https://cocowyo.com/cdn/shop/files/PRH-new.png?v=1776325503&width=500",
                Alt = "Penguin Random House feature badge", SortIndex = 0 },
            new FeaturedOnLink { Slug = "etsy", Label = "Etsy",
                Href = "https://www.etsy.com/",
                Image = "https://cocowyo.com/cdn/shop/files/Etsy-new.png?v=1776325502&width=500",
                Alt = "Etsy feature badge", SortIndex = 1 },
            new FeaturedOnLink { Slug = "amazon", Label = "Amazon",
                Href = "https://www.amazon.com/",
                Image = "https://cocowyo.com/cdn/shop/files/Amazon-new.png?v=1776325503&width=500",
                Alt = "Amazon feature badge", SortIndex = 2 },
            new FeaturedOnLink { Slug = "tiktok-shop", Label = "TikTok Shop",
                Href = "https://www.tiktok.com/shop",
                Image = "https://cocowyo.com/cdn/shop/files/TTS-new.png?v=1776325503&width=500",
                Alt = "TikTok Shop feature badge", SortIndex = 3 }
        );
        await db.SaveChangesAsync();
    }
}
