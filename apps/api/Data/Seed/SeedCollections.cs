using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedCollections
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.Collections.AnyAsync()) return;

        var collections = new List<Collection>
        {
            new() { Slug = "all", Title = "Products", Excerpt = "Every fixture product in this learning clone.",
                    DefaultSort = SortKey.TitleAscending, SortIndex = 0,
                    ProductOrder = new List<string>() },
            new() { Slug = "vinyl-sticker-packs", Title = "Vinyl Sticker Packs",
                    Excerpt = "Sticker packs with the same sale-card behavior as the public store.",
                    DefaultSort = SortKey.Relevance, SortIndex = 1,
                    ProductOrder = new List<string> { "cute-things-vinyl-sticker-pack-100pcs", "cozy-friends-vinyl-sticker-pack-100pcs" } },
            new() { Slug = "physical-books", Title = "Zoe&Book Coloring Books",
                    Excerpt = "Paperback, spiral-bound, and collaboration coloring books.",
                    DefaultSort = SortKey.BestSelling, SortIndex = 2,
                    ProductOrder = new List<string>() },
            new() { Slug = "spiral-bound", Title = "Spiral-bound",
                    Excerpt = "Spiral-bound coloring book and sticker set products.",
                    DefaultSort = SortKey.TitleAscending, SortIndex = 3,
                    ProductOrder = new List<string>() },
            new() { Slug = "paperback-coloring-book", Title = "Paperback",
                    Excerpt = "Physical paperback-style coloring book products.",
                    DefaultSort = SortKey.TitleAscending, SortIndex = 4,
                    ProductOrder = new List<string>() },
            new() { Slug = "digital", Title = "Digital",
                    Excerpt = "Printable digital coloring page products.",
                    DefaultSort = SortKey.TitleAscending, HomepageSlot = HomepageSlot.Digital, SortIndex = 5,
                    ProductOrder = new List<string>() },
            new() { Slug = "collab-collection", Title = "Collab Collection",
                    Excerpt = "Public collaboration titles represented in the local clone.",
                    DefaultSort = SortKey.TitleAscending, SortIndex = 6,
                    ProductOrder = new List<string>() },
            new() { Slug = "frontpage", Title = "Best Seller",
                    Excerpt = "Best-selling titles highlighted on the homepage.",
                    DefaultSort = SortKey.BestSelling, HomepageSlot = HomepageSlot.BestSeller, SortIndex = 7,
                    ProductOrder = new List<string>
                    {
                        "cozy-christmas-coloring-book", "girl-moments-coloring-book",
                        "girl-moments-coloring-book-vol-2", "ocean-scene-coloring-book",
                        "little-corner-coloring-book", "cozy-friends-coloring-book",
                    } },
            new() { Slug = "new-release", Title = "New Release",
                    Excerpt = "Newer public products and sale cards.",
                    DefaultSort = SortKey.CreatedDescending, HomepageSlot = HomepageSlot.NewRelease, SortIndex = 8,
                    ProductOrder = new List<string>
                    {
                        "cozy-friends-vinyl-sticker-pack-100pcs", "cute-things-vinyl-sticker-pack-100pcs",
                        "comfy-corner-coloring-book", "little-cuddles-coloring-book-spiral-bound-and-sticker-set",
                    } },
            new() { Slug = "cute-comfy", Title = "Cute & Comfy",
                    Excerpt = "Cozy character books, gentle corners, and comfy scenes.",
                    DefaultSort = SortKey.BestSelling, HomepageSlot = HomepageSlot.Tile, SortIndex = 9,
                    ProductOrder = new List<string>() },
            new() { Slug = "bold-easy", Title = "Bold & Easy",
                    Excerpt = "Large, simple, easy-to-color pages.",
                    DefaultSort = SortKey.TitleAscending, HomepageSlot = HomepageSlot.Tile, SortIndex = 10,
                    ProductOrder = new List<string>() },
            new() { Slug = "classic", Title = "Classic",
                    Excerpt = "Recognizable cozy book titles.",
                    DefaultSort = SortKey.TitleAscending, HomepageSlot = HomepageSlot.Tile, SortIndex = 11,
                    ProductOrder = new List<string>() },
            new() { Slug = "seasonal", Title = "Seasonal",
                    Excerpt = "Christmas, spooky, and seasonally cozy titles.",
                    DefaultSort = SortKey.TitleAscending, HomepageSlot = HomepageSlot.Tile, SortIndex = 12,
                    ProductOrder = new List<string>() },
            new() { Slug = "patterns", Title = "Patterns",
                    Excerpt = "Pattern-based bold and easy coloring books.",
                    DefaultSort = SortKey.TitleAscending, SortIndex = 13,
                    ProductOrder = new List<string>() },
            new() { Slug = "freebies", Title = "Freebies",
                    Excerpt = "Free mini coloring resources.",
                    DefaultSort = SortKey.TitleAscending, SortIndex = 14,
                    ProductOrder = new List<string> { "mini-coloring-book" } },
        };

        db.Collections.AddRange(collections);
        await db.SaveChangesAsync();

        // ===== Product → collection membership =====
        // Ported verbatim from products.ts — one entry per product, 27 total.
        var membership = new Dictionary<string, List<string>>
        {
            ["cozy-christmas-coloring-book"] = new() { "all", "frontpage", "new-release", "collab-collection", "physical-books", "paperback-coloring-book", "seasonal", "cute-comfy" },
            ["comfy-corner-coloring-book"] = new() { "all", "new-release", "collab-collection", "physical-books", "paperback-coloring-book", "cute-comfy" },
            ["little-cuddles-coloring-book-spiral-bound-and-sticker-set"] = new() { "all", "new-release", "physical-books", "spiral-bound", "cute-comfy" },
            ["cozy-friends-vinyl-sticker-pack-100pcs"] = new() { "all", "vinyl-sticker-packs", "new-release" },
            ["cute-things-vinyl-sticker-pack-100pcs"] = new() { "all", "vinyl-sticker-packs", "new-release" },
            ["cozy-friends-coloring-book"] = new() { "all", "frontpage", "physical-books", "paperback-coloring-book", "cute-comfy", "collab-collection" },
            ["girl-moments-coloring-book"] = new() { "all", "frontpage", "physical-books", "paperback-coloring-book", "classic" },
            ["girl-moments-coloring-book-vol-2"] = new() { "all", "frontpage", "physical-books", "paperback-coloring-book", "classic" },
            ["ocean-scene-coloring-book"] = new() { "all", "frontpage", "physical-books", "paperback-coloring-book", "classic" },
            ["little-corner-coloring-book"] = new() { "all", "frontpage", "physical-books", "paperback-coloring-book", "cute-comfy" },
            ["cozy-days-coloring-book"] = new() { "all", "physical-books", "paperback-coloring-book", "cute-comfy", "seasonal" },
            ["cozy-cuties-coloring-book"] = new() { "all", "collab-collection", "physical-books", "paperback-coloring-book", "cute-comfy" },
            ["cozy-corner-coloring-book"] = new() { "all", "collab-collection", "physical-books", "paperback-coloring-book" },
            ["spooky-cutie-coloring-book"] = new() { "all", "physical-books", "paperback-coloring-book", "seasonal" },
            ["spooky-cutie-coloring-book-vol-2"] = new() { "all", "physical-books", "paperback-coloring-book", "seasonal" },
            ["comfy-days-coloring-book-spiral-bound-and-sticker-set"] = new() { "all", "physical-books", "spiral-bound", "seasonal" },
            ["girl-moments-coloring-book-vol-2-spiral-bound-and-sticky-set"] = new() { "all", "physical-books", "spiral-bound", "classic" },
            ["combo-1-little-cuddles"] = new() { "all", "digital" },
            ["combo-2-little-cuddles"] = new() { "all", "digital" },
            ["combo-3-little-cuddles"] = new() { "all", "digital" },
            ["combo-4-little-cuddles"] = new() { "all", "digital" },
            ["cozy-friends-coloring-pages"] = new() { "all", "digital" },
            ["spooky-cutie-coloring-pages"] = new() { "all", "digital", "seasonal" },
            ["comfy-patterns-coloring-book"] = new() { "all", "physical-books", "paperback-coloring-book", "patterns", "bold-easy" },
            ["cute-groovy-coloring-book"] = new() { "all", "physical-books", "paperback-coloring-book", "patterns", "bold-easy" },
            ["food-drink-sweets-coloring-book"] = new() { "all", "physical-books", "paperback-coloring-book", "bold-easy" },
            ["mini-coloring-book"] = new() { "all", "freebies" },
        };

        var collectionsBySlug = await db.Collections.ToDictionaryAsync(c => c.Slug);
        var productsBySlug = await db.Products.ToDictionaryAsync(p => p.Slug);

        foreach (var (productSlug, collectionSlugs) in membership)
        {
            if (!productsBySlug.TryGetValue(productSlug, out var product)) continue;
            foreach (var collectionSlug in collectionSlugs)
            {
                if (!collectionsBySlug.TryGetValue(collectionSlug, out var collection)) continue;
                db.ProductCollections.Add(new ProductCollection
                {
                    ProductId = product.Id,
                    CollectionId = collection.Id,
                });
            }
        }
        await db.SaveChangesAsync();
    }
}
