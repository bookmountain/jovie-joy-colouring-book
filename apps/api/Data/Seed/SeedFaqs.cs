using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedFaqs
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.Faqs.AnyAsync()) return;

        db.Faqs.AddRange(
            new Faq { Slug = "where-buy-physical", SortIndex = 0,
                Question = "Where can I buy Zoe&Book physical coloring books?",
                Answer = "Amazon: Available on Amazon in the US, UK, Canada, Australia, Germany, France, Italy, and more. Availability depends on the official marketplace in your country. Partner bookstores may also carry selected cozy titles.",
                Links = new List<FaqLink>
                {
                    new("Amazon", "https://www.amazon.com/"),
                    new("Penguin Random House", "https://www.penguinrandomhouse.com/"),
                } },
            new Faq { Slug = "where-buy-digital", SortIndex = 1,
                Question = "Where can I buy Zoe&Book digital coloring pages?",
                Answer = "You can find digital coloring pages as instant downloads through the Etsy-style marketplace link. Choose a favorite, download instantly, and print on your preferred paper or color digitally.",
                Links = new List<FaqLink> { new("Etsy", "https://www.etsy.com/") } },
            new Faq { Slug = "where-share", SortIndex = 2,
                Question = "Where can I share my finished coloring pages?",
                Answer = "We would love to see finished pages on Instagram, TikTok, and the coloring community. Tag your posts with Zoe&Book-friendly hashtags when you share.",
                Links = null },
            new Faq { Slug = "support", SortIndex = 3,
                Question = "Need support?",
                Answer = "Use hello@zoeandbook.com for customer care or studio@zoeandbook.com for licensing inquiries.",
                Links = null }
        );
        await db.SaveChangesAsync();
    }
}
