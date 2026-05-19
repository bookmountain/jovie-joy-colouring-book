using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedGallery
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.GalleryImages.AnyAsync()) return;

        db.GalleryImages.AddRange(
            new GalleryImage { Src = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-christmas-coloring-book_04b4e1c3-4640-4fb9-ba1e-3ecfa5f1ad00.png?v=1775733386", Alt = "Cozy Christmas book cover", SortIndex = 0 },
            new GalleryImage { Src = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-little-cuddles-coloring-book.png?v=1775731802", Alt = "Little Cuddles book cover", SortIndex = 1 },
            new GalleryImage { Src = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-girl-moments-coloring-book_7c63e197-0a4f-45e0-a292-6ccc40f8303f.png?v=1775733493", Alt = "Girl Moments book cover", SortIndex = 2 },
            new GalleryImage { Src = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-friends-vinyl-sticker-packs-new.png?v=1777944846", Alt = "Cozy Friends sticker pack", SortIndex = 3 },
            new GalleryImage { Src = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-cozy-days-coloring-book_634ce46b-290b-4d6c-8b71-862b0c268929.png?v=1775731500", Alt = "Cozy Days book cover", SortIndex = 4 },
            new GalleryImage { Src = "https://cdn.shopify.com/s/files/1/0602/0133/6893/files/1-spooky-cutie-coloring-book_0e2baac1-9f03-4599-803a-dc39922ca693.png?v=1775733933", Alt = "Spooky Cutie book cover", SortIndex = 5 }
        );
        await db.SaveChangesAsync();
    }
}
