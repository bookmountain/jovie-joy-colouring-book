using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedFreebies
{
    public static async Task RunAsync(AppDbContext db, bool initializeDefaults = false)
    {
        if (!initializeDefaults || await db.Freebies.AnyAsync())
            return;

        db.Freebies.Add(new Freebie
        {
            Slug = "mini-coloring-book",
            Title = "Mini Coloring Book",
            Excerpt = "A 6-page sampler PDF — print and colour.",
            Description = new List<string>
            {
                "Six hand-drawn pages, perfect for a quick afternoon.",
                "Drop your email below and we'll send the download link.",
            },
            // Use a CDN cover (same convention as SeedProducts/SeedGallery) — the
            // previous /uploads/... path pointed at a file that never shipped and
            // 404'd on the storefront.
            CoverImage = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-little-cuddles-coloring-book.png?v=1775731802",
            // The repository intentionally does not ship customer-download files.
            // Upload the real asset in CMS before publishing this seeded draft.
            FilePath = "",
            FileKind = "",
            FileSizeBytes = 0,
            SortIndex = 0,
            Published = false,
        });
        await db.SaveChangesAsync();
    }
}
