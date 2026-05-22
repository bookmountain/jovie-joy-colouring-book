using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedFreebies
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.Freebies.AnyAsync())
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
            CoverImage = "/uploads/freebies/covers/mini-cover.png",
            FilePath = "/uploads/freebies/files/mini-coloring-book.pdf",
            FileKind = "pdf",
            FileSizeBytes = 0,
            SortIndex = 0,
            Published = true,
        });
        await db.SaveChangesAsync();
    }
}
