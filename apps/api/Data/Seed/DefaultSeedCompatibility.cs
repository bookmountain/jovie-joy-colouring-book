using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

/// <summary>
/// Classifies databases created before the durable seed marker existed.
/// Recovery is intentionally conservative: only an exact prefix of a known
/// seed run, with no user or operational data, may be reset and completed.
/// Everything else is adopted as an established database so CMS deletions and
/// edits are preserved.
/// </summary>
internal static class DefaultSeedCompatibility
{
    private enum SectionState
    {
        Empty,
        CompleteSeed,
        PartialSeed,
        Other,
    }

    private enum Section
    {
        Content,
        Products,
        Freebies,
        Collections,
        Blogs,
        Comics,
        About,
        Gallery,
        Navigation,
        Pages,
        Faqs,
        FeaturedOn,
    }

    // DbSeeder used the legacy order before the global new-database gate was
    // introduced. Recognising both orders makes recovery safe across that change.
    private static readonly Section[] LegacyOrder =
    [
        Section.Products,
        Section.Freebies,
        Section.Collections,
        Section.Content,
        Section.Blogs,
        Section.Comics,
        Section.About,
        Section.Gallery,
        Section.Navigation,
        Section.Pages,
        Section.Faqs,
        Section.FeaturedOn,
    ];

    private static readonly Section[] CurrentOrder =
    [
        Section.Content,
        Section.Products,
        Section.Freebies,
        Section.Collections,
        Section.Blogs,
        Section.Comics,
        Section.About,
        Section.Gallery,
        Section.Navigation,
        Section.Pages,
        Section.Faqs,
        Section.FeaturedOn,
    ];

    private static readonly HashSet<string> ProductSlugs =
    [
        "cozy-christmas-coloring-book",
        "comfy-corner-coloring-book",
        "little-cuddles-coloring-book-spiral-bound-and-sticker-set",
        "cozy-friends-vinyl-sticker-pack-100pcs",
        "cute-things-vinyl-sticker-pack-100pcs",
        "cozy-friends-coloring-book",
        "girl-moments-coloring-book",
        "girl-moments-coloring-book-vol-2",
        "ocean-scene-coloring-book",
        "little-corner-coloring-book",
        "cozy-days-coloring-book",
        "cozy-cuties-coloring-book",
        "cozy-corner-coloring-book",
        "spooky-cutie-coloring-book",
        "spooky-cutie-coloring-book-vol-2",
        "comfy-days-coloring-book-spiral-bound-and-sticker-set",
        "girl-moments-coloring-book-vol-2-spiral-bound-and-sticky-set",
        "combo-1-little-cuddles",
        "combo-2-little-cuddles",
        "combo-3-little-cuddles",
        "combo-4-little-cuddles",
        "cozy-friends-coloring-pages",
        "spooky-cutie-coloring-pages",
        "comfy-patterns-coloring-book",
        "cute-groovy-coloring-book",
        "food-drink-sweets-coloring-book",
    ];

    private static readonly HashSet<string> FreebieSlugs = ["mini-coloring-book"];

    private static readonly HashSet<string> CollectionSlugs =
    [
        "all", "vinyl-sticker-packs", "physical-books", "spiral-bound",
        "paperback-coloring-book", "digital", "collab-collection", "frontpage",
        "new-release", "cute-comfy", "bold-easy", "classic", "seasonal", "patterns",
    ];

    private static readonly HashSet<string> ContentKeys =
    [
        "home.hero.slides", "announcement.bar", "home.video", "hero.artwork.faq",
        "hero.artwork.footer", "home.intro", "home.cozy-moments.header",
        "footer.contact", "header.brand", "newsletter.copy", "home.row.new-release",
        "home.row.best-seller", "home.row.digital",
    ];

    private static readonly HashSet<string> LegacyContentKeys =
        new(ContentKeys.Append("home.hero"), StringComparer.Ordinal);

    private static readonly HashSet<string> BlogCategorySlugs =
    [
        "htc", "coloring-book-guide", "color-world", "diy", "product-guide",
    ];

    private static readonly HashSet<string> ArticleSlugs =
    [
        "how-to-color-cozy-scenes", "choosing-markers-for-bold-pages", "soft-color-palettes",
    ];

    private static readonly HashSet<string> ComicWorldSignatures =
    [
        Signature("Spooky Cutie World", 0),
        Signature("Cozy Friend World", 1),
        Signature("Lala Friends World", 2),
    ];

    private static readonly HashSet<string> ComicSignatures =
    [
        Signature("Twisted Potato", 0), Signature("Fried Egg", 1),
        Signature("\"That's my type\" of day", 0), Signature("Aquarium Trip", 1),
        Signature("Crocie's Bakery", 2), Signature("Crocie's Bakery Menu", 3),
        Signature("Grocery Day", 4), Signature("Bugatti Challenge", 5),
        Signature("Big Fish", 0),
    ];

    private static readonly HashSet<string> AboutSignatures =
    [
        Signature("Little team with a cozy dream", 0),
        Signature("Life can be uncomfy, we know that", 1),
        Signature("A corner sparks tender creativity", 2),
        Signature("We're not perfect!", 3),
    ];

    private static readonly HashSet<string> GallerySignatures =
    [
        Signature("Cozy Christmas book cover", 0),
        Signature("Little Cuddles book cover", 1),
        Signature("Girl Moments book cover", 2),
        Signature("Cozy Friends sticker pack", 3),
        Signature("Cozy Days book cover", 4),
        Signature("Spooky Cutie book cover", 5),
    ];

    private static readonly HashSet<string> RootNavSignatures =
    [
        Signature("Home", "/", 0), Signature("Products", "/products", 1),
        Signature("Blogs", "/blogs/htc", 2), Signature("Gallery", "/pages/gallery", 3),
        Signature("About Us", "/pages/about-us", 4), Signature("Comics", "/pages/comics", 5),
        Signature("Freebies", "/pages/freebies", 6), Signature("FAQs", "/pages/faqs", 7),
    ];

    private static readonly HashSet<string> ProductNavSignatures =
    [
        Signature("Go to Products", "/products", 0),
        Signature("Sticker Packs", "/collections/vinyl-sticker-packs", 1),
        Signature("Physical Books", "/collections/physical-books", 2),
        Signature("Digital Books", "/collections/digital", 3),
        Signature("Collab Collection", "/collections/collab-collection", 4),
    ];

    private static readonly HashSet<string> RemainingNavSignatures =
    [
        Signature("Go to Physical Books", "/collections/physical-books", 0),
        Signature("Spiral-bound", "/collections/spiral-bound", 1),
        Signature("Paperback", "/collections/paperback", 2),
        Signature("Go to Blogs", "/blogs/htc", 0),
        Signature("How To Color Series", "/blogs/htc", 1),
        Signature("Tools & Tips", "/blogs/coloring-book-guide", 2),
        Signature("Color World", "/blogs/color-world", 3),
        Signature("Lifestyle & DIY", "/blogs/diy", 4),
        Signature("Product Guide", "/blogs/product-guide", 5),
    ];

    private static readonly HashSet<string> ProductStageNavSignatures =
        new(RootNavSignatures.Concat(ProductNavSignatures), StringComparer.Ordinal);

    private static readonly HashSet<string> AllNavSignatures =
        new(ProductStageNavSignatures.Concat(RemainingNavSignatures), StringComparer.Ordinal);

    private static readonly HashSet<string> FooterSignatures =
    [
        Signature("info", "About us", "/pages/about-us", 0),
        Signature("info", "FAQs", "/pages/faqs", 1),
        Signature("info", "Blogs", "/blogs/htc", 2),
        Signature("info", "Gallery", "/pages/gallery", 3),
        Signature("our-book", "Cute & Comfy", "/collections/cute-comfy", 0),
        Signature("our-book", "Bold Easy", "/collections/bold-easy", 1),
        Signature("our-book", "Classic", "/collections/classic", 2),
        Signature("our-book", "Best Sellers", "/collections/frontpage", 3),
        Signature("our-book", "New Release", "/collections/new-release", 4),
    ];

    private static readonly HashSet<string> SocialSignatures =
    [
        Signature("Facebook", "https://www.facebook.com/", 0),
        Signature("Instagram", "https://www.instagram.com/", 1),
        Signature("Pinterest", "https://www.pinterest.com/", 2),
        Signature("TikTok", "https://www.tiktok.com/", 3),
        Signature("YouTube", "https://www.youtube.com/", 4),
        Signature("Threads", "https://www.threads.net/", 5),
    ];

    private static readonly HashSet<string> TrendingSignatures =
    [
        Signature("spooky cuties", 0), Signature("girl moment", 1),
        Signature("cozy friends", 2), Signature("cozy days", 3),
        Signature("cozy cuties", 4), Signature("little corner", 5),
    ];

    private static readonly HashSet<string> PageSlugs =
    [
        "about-us", "gallery", "comics", "freebies", "faq",
    ];

    private static readonly HashSet<string> FaqSlugs =
    [
        "where-buy-physical", "where-buy-digital", "where-share", "support",
    ];

    private static readonly HashSet<string> FeaturedOnSlugs =
    [
        "penguin", "etsy", "amazon", "tiktok-shop",
    ];

    public static async Task<bool> IsCompletelyEmptyAsync(AppDbContext db) =>
        !await db.Users.AnyAsync() &&
        !await db.Products.AnyAsync() &&
        !await db.Collections.AnyAsync() &&
        !await db.ProductCollections.AnyAsync() &&
        !await db.Orders.AnyAsync() &&
        !await db.OrderItems.AnyAsync() &&
        !await db.ContentBlocks.AnyAsync() &&
        !await db.Wishlists.AnyAsync() &&
        !await db.NewsletterSubscribers.AnyAsync() &&
        !await db.NotifyMeRequests.AnyAsync() &&
        !await db.BlogCategories.AnyAsync() &&
        !await db.Articles.AnyAsync() &&
        !await db.ComicWorlds.AnyAsync() &&
        !await db.Comics.AnyAsync() &&
        !await db.AboutSections.AnyAsync() &&
        !await db.GalleryImages.AnyAsync() &&
        !await db.StaticPages.AnyAsync() &&
        !await db.NavLinks.AnyAsync() &&
        !await db.FooterLinks.AnyAsync() &&
        !await db.SocialLinks.AnyAsync() &&
        !await db.FeaturedOnLinks.AnyAsync() &&
        !await db.TrendingTerms.AnyAsync() &&
        !await db.Faqs.AnyAsync() &&
        !await db.Freebies.AnyAsync() &&
        !await db.FreebieRequests.AnyAsync();

    public static async Task<bool> IsSafelyRecoverableLegacyPartialAsync(AppDbContext db)
    {
        // A failed default seed never reaches admin creation and cannot contain
        // customer activity. Any such row is evidence that this is established.
        if (await db.Users.AnyAsync() ||
            await db.Orders.AnyAsync() ||
            await db.OrderItems.AnyAsync() ||
            await db.Wishlists.AnyAsync() ||
            await db.NewsletterSubscribers.AnyAsync() ||
            await db.NotifyMeRequests.AnyAsync() ||
            await db.FreebieRequests.AnyAsync())
        {
            return false;
        }

        var states = new Dictionary<Section, SectionState>
        {
            [Section.Content] = await ClassifyContentAsync(db),
            [Section.Products] = ClassifyAtomic(
                await db.Products.AsNoTracking().Select(x => x.Slug).ToListAsync(), ProductSlugs),
            [Section.Freebies] = ClassifyAtomic(
                await db.Freebies.AsNoTracking().Select(x => x.Slug).ToListAsync(), FreebieSlugs),
            [Section.Collections] = await ClassifyCollectionsAsync(db),
            [Section.Blogs] = await ClassifyBlogsAsync(db),
            [Section.Comics] = await ClassifyComicsAsync(db),
            [Section.About] = await ClassifyAboutAsync(db),
            [Section.Gallery] = await ClassifyGalleryAsync(db),
            [Section.Navigation] = await ClassifyNavigationAsync(db),
            [Section.Pages] = ClassifyAtomic(
                await db.StaticPages.AsNoTracking().Select(x => x.Slug).ToListAsync(), PageSlugs),
            [Section.Faqs] = ClassifyAtomic(
                await db.Faqs.AsNoTracking().Select(x => x.Slug).ToListAsync(), FaqSlugs),
            [Section.FeaturedOn] = ClassifyAtomic(
                await db.FeaturedOnLinks.AsNoTracking().Select(x => x.Slug).ToListAsync(), FeaturedOnSlugs),
        };

        return MatchesIncompleteSeedPrefix(states, CurrentOrder) ||
               MatchesIncompleteSeedPrefix(states, LegacyOrder);
    }

    public static async Task ClearSeedManagedDataAsync(AppDbContext db)
    {
        // Dependency rows must go first. This path is reached only after the strict
        // legacy fingerprint above proves there is no user-generated/operational data.
        db.ProductCollections.RemoveRange(await db.ProductCollections.ToListAsync());
        db.Articles.RemoveRange(await db.Articles.ToListAsync());
        db.Comics.RemoveRange(await db.Comics.ToListAsync());
        db.NavLinks.RemoveRange(await db.NavLinks.ToListAsync());

        db.Products.RemoveRange(await db.Products.ToListAsync());
        db.Collections.RemoveRange(await db.Collections.ToListAsync());
        db.ContentBlocks.RemoveRange(await db.ContentBlocks.ToListAsync());
        db.BlogCategories.RemoveRange(await db.BlogCategories.ToListAsync());
        db.ComicWorlds.RemoveRange(await db.ComicWorlds.ToListAsync());
        db.AboutSections.RemoveRange(await db.AboutSections.ToListAsync());
        db.GalleryImages.RemoveRange(await db.GalleryImages.ToListAsync());
        db.StaticPages.RemoveRange(await db.StaticPages.ToListAsync());
        db.FooterLinks.RemoveRange(await db.FooterLinks.ToListAsync());
        db.SocialLinks.RemoveRange(await db.SocialLinks.ToListAsync());
        db.FeaturedOnLinks.RemoveRange(await db.FeaturedOnLinks.ToListAsync());
        db.TrendingTerms.RemoveRange(await db.TrendingTerms.ToListAsync());
        db.Faqs.RemoveRange(await db.Faqs.ToListAsync());
        db.Freebies.RemoveRange(await db.Freebies.ToListAsync());

        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
    }

    private static async Task<SectionState> ClassifyContentAsync(AppDbContext db)
    {
        var keys = await db.ContentBlocks.AsNoTracking().Select(x => x.Key).ToListAsync();
        if (keys.Count == 0) return SectionState.Empty;
        return Exact(keys, ContentKeys) || Exact(keys, LegacyContentKeys)
            ? SectionState.CompleteSeed
            : SectionState.Other;
    }

    private static async Task<SectionState> ClassifyCollectionsAsync(AppDbContext db)
    {
        var slugs = await db.Collections.AsNoTracking().Select(x => x.Slug).ToListAsync();
        var membershipCount = await db.ProductCollections.CountAsync();
        if (slugs.Count == 0 && membershipCount == 0) return SectionState.Empty;
        if (!Exact(slugs, CollectionSlugs)) return SectionState.Other;
        return membershipCount switch
        {
            108 => SectionState.CompleteSeed,
            0 => SectionState.PartialSeed,
            _ => SectionState.Other,
        };
    }

    private static async Task<SectionState> ClassifyBlogsAsync(AppDbContext db)
    {
        var categories = await db.BlogCategories.AsNoTracking().Select(x => x.Slug).ToListAsync();
        var articles = await db.Articles.AsNoTracking().Select(x => x.Slug).ToListAsync();
        if (categories.Count == 0 && articles.Count == 0) return SectionState.Empty;
        if (!Exact(categories, BlogCategorySlugs)) return SectionState.Other;
        if (articles.Count == 0) return SectionState.PartialSeed;
        return Exact(articles, ArticleSlugs) ? SectionState.CompleteSeed : SectionState.Other;
    }

    private static async Task<SectionState> ClassifyComicsAsync(AppDbContext db)
    {
        var worldRows = await db.ComicWorlds.AsNoTracking()
            .Select(x => new { x.Title, x.SortIndex }).ToListAsync();
        var comicRows = await db.Comics.AsNoTracking()
            .Select(x => new { x.Title, x.SortIndex }).ToListAsync();
        var worlds = worldRows.Select(x => Signature(x.Title, x.SortIndex)).ToList();
        var comics = comicRows.Select(x => Signature(x.Title, x.SortIndex)).ToList();
        if (worlds.Count == 0 && comics.Count == 0) return SectionState.Empty;
        if (!Exact(worlds, ComicWorldSignatures)) return SectionState.Other;
        if (comics.Count == 0) return SectionState.PartialSeed;
        return Exact(comics, ComicSignatures) ? SectionState.CompleteSeed : SectionState.Other;
    }

    private static async Task<SectionState> ClassifyNavigationAsync(AppDbContext db)
    {
        var navRows = await db.NavLinks.AsNoTracking()
            .Select(x => new { x.Label, x.Href, x.SortIndex }).ToListAsync();
        var footerRows = await db.FooterLinks.AsNoTracking()
            .Select(x => new { x.GroupKey, x.Label, x.Href, x.SortIndex }).ToListAsync();
        var socialRows = await db.SocialLinks.AsNoTracking()
            .Select(x => new { x.Label, x.Href, x.SortIndex }).ToListAsync();
        var trendingRows = await db.TrendingTerms.AsNoTracking()
            .Select(x => new { x.Term, x.SortIndex }).ToListAsync();

        var nav = navRows.Select(x => Signature(x.Label, x.Href, x.SortIndex)).ToList();
        var footer = footerRows
            .Select(x => Signature(x.GroupKey, x.Label, x.Href, x.SortIndex)).ToList();
        var social = socialRows.Select(x => Signature(x.Label, x.Href, x.SortIndex)).ToList();
        var trending = trendingRows.Select(x => Signature(x.Term, x.SortIndex)).ToList();

        if (nav.Count == 0 && footer.Count == 0 && social.Count == 0 && trending.Count == 0)
            return SectionState.Empty;

        if (Exact(nav, AllNavSignatures) && Exact(footer, FooterSignatures) &&
            Exact(social, SocialSignatures) && Exact(trending, TrendingSignatures))
        {
            return SectionState.CompleteSeed;
        }

        var auxiliaryTablesEmpty = footer.Count == 0 && social.Count == 0 && trending.Count == 0;
        if (auxiliaryTablesEmpty &&
            (Exact(nav, RootNavSignatures) || Exact(nav, ProductStageNavSignatures)))
        {
            return SectionState.PartialSeed;
        }

        return SectionState.Other;
    }

    private static async Task<SectionState> ClassifyAboutAsync(AppDbContext db)
    {
        var rows = await db.AboutSections.AsNoTracking()
            .Select(x => new { x.Title, x.SortIndex }).ToListAsync();
        return ClassifyAtomic(
            rows.Select(x => Signature(x.Title, x.SortIndex)).ToList(), AboutSignatures);
    }

    private static async Task<SectionState> ClassifyGalleryAsync(AppDbContext db)
    {
        var rows = await db.GalleryImages.AsNoTracking()
            .Select(x => new { x.Alt, x.SortIndex }).ToListAsync();
        return ClassifyAtomic(
            rows.Select(x => Signature(x.Alt, x.SortIndex)).ToList(), GallerySignatures);
    }

    private static SectionState ClassifyAtomic(
        IReadOnlyCollection<string> actual,
        IReadOnlySet<string> expected)
    {
        if (actual.Count == 0) return SectionState.Empty;
        return Exact(actual, expected) ? SectionState.CompleteSeed : SectionState.Other;
    }

    private static bool Exact(IReadOnlyCollection<string> actual, IReadOnlySet<string> expected) =>
        actual.Count == expected.Count && actual.ToHashSet(StringComparer.Ordinal).SetEquals(expected);

    private static bool MatchesIncompleteSeedPrefix(
        IReadOnlyDictionary<Section, SectionState> states,
        IReadOnlyList<Section> order)
    {
        var reachedIncompleteSection = false;
        var foundSeedRows = false;

        foreach (var section in order)
        {
            switch (states[section])
            {
                case SectionState.CompleteSeed when !reachedIncompleteSection:
                    foundSeedRows = true;
                    break;
                case SectionState.PartialSeed when !reachedIncompleteSection:
                    foundSeedRows = true;
                    reachedIncompleteSection = true;
                    break;
                case SectionState.Empty:
                    reachedIncompleteSection = true;
                    break;
                default:
                    return false;
            }
        }

        // A complete legacy seed is adopted; an entirely empty DB is handled as fresh.
        return foundSeedRows && reachedIncompleteSection;
    }

    private static string Signature(string value, int sortIndex) =>
        $"{value}\u001f{sortIndex}";

    private static string Signature(string value1, string value2, int sortIndex) =>
        $"{value1}\u001f{value2}\u001f{sortIndex}";

    private static string Signature(string value1, string value2, string value3, int sortIndex) =>
        $"{value1}\u001f{value2}\u001f{value3}\u001f{sortIndex}";
}
