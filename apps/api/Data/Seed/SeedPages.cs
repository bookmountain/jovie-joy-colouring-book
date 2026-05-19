using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedPages
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.StaticPages.AnyAsync()) return;

        db.StaticPages.AddRange(
            new StaticPage { Slug = "about-us", Title = "About Us",
                Intro = "A cozy look at the small creative team behind the books.",
                Blocks = new List<string>
                {
                    "Zoe&Book centers comfort, self-expression, and approachable coloring books.",
                    "This local page mirrors the structure while keeping the wording brief and replaceable.",
                } },
            new StaticPage { Slug = "gallery", Title = "Gallery",
                Intro = "A gallery-style page for cozy moments and finished-color inspiration.",
                Blocks = new List<string> { "Use this page to test image grids and responsive gallery layouts." } },
            new StaticPage { Slug = "comics", Title = "Comics",
                Intro = "Little comic worlds, free download actions, and cozy page galleries.",
                Blocks = new List<string> { "Comic entries can be added to this fixture later." } },
            new StaticPage { Slug = "freebies", Title = "Freebies",
                Intro = "A simple page for free mini coloring resources.",
                Blocks = new List<string> { "Freebie products are pulled from the freebies collection." } },
            new StaticPage { Slug = "faq", Title = "FAQs",
                Intro = "Common store questions in an accordion layout.",
                Blocks = new List<string> { "FAQ entries come from the dedicated FAQ fixture." } }
        );
        await db.SaveChangesAsync();
    }
}
