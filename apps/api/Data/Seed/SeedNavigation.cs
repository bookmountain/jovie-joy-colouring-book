using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data.Seed;

public static class SeedNavigation
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.NavLinks.AnyAsync()) return;

        // Primary nav (3-level tree)
        var home = new NavLink { Label = "Home", Href = "/", SortIndex = 0 };
        var products = new NavLink { Label = "Products", Href = "/products", SortIndex = 1 };
        var blogs = new NavLink { Label = "Blogs", Href = "/blogs/htc", SortIndex = 2 };
        var gallery = new NavLink { Label = "Gallery", Href = "/pages/gallery", SortIndex = 3 };
        var about = new NavLink { Label = "About Us", Href = "/pages/about-us", SortIndex = 4 };
        var comics = new NavLink { Label = "Comics", Href = "/pages/comics", SortIndex = 5 };
        var freebies = new NavLink { Label = "Freebies", Href = "/pages/freebies", SortIndex = 6 };
        var faqs = new NavLink { Label = "FAQs", Href = "/pages/faqs", SortIndex = 7 };
        db.NavLinks.AddRange(home, products, blogs, gallery, about, comics, freebies, faqs);
        await db.SaveChangesAsync();

        var pGo = new NavLink { ParentId = products.Id, Label = "Go to Products", Href = "/products", SortIndex = 0 };
        var pStick = new NavLink { ParentId = products.Id, Label = "Sticker Packs", Href = "/collections/vinyl-sticker-packs", SortIndex = 1 };
        var pPhysical = new NavLink { ParentId = products.Id, Label = "Physical Books", Href = "/collections/physical-books", SortIndex = 2 };
        var pDigital = new NavLink { ParentId = products.Id, Label = "Digital Books", Href = "/collections/digital", SortIndex = 3 };
        var pCollab = new NavLink { ParentId = products.Id, Label = "Collab Collection", Href = "/collections/collab-collection", SortIndex = 4 };
        db.NavLinks.AddRange(pGo, pStick, pPhysical, pDigital, pCollab);
        await db.SaveChangesAsync();

        db.NavLinks.AddRange(
            new NavLink { ParentId = pPhysical.Id, Label = "Go to Physical Books", Href = "/collections/physical-books", SortIndex = 0 },
            new NavLink { ParentId = pPhysical.Id, Label = "Spiral-bound", Href = "/collections/spiral-bound", SortIndex = 1 },
            new NavLink { ParentId = pPhysical.Id, Label = "Paperback", Href = "/collections/paperback", SortIndex = 2 }
        );

        db.NavLinks.AddRange(
            new NavLink { ParentId = blogs.Id, Label = "Go to Blogs", Href = "/blogs/htc", SortIndex = 0 },
            new NavLink { ParentId = blogs.Id, Label = "How To Color Series", Href = "/blogs/htc", SortIndex = 1 },
            new NavLink { ParentId = blogs.Id, Label = "Tools & Tips", Href = "/blogs/coloring-book-guide", SortIndex = 2 },
            new NavLink { ParentId = blogs.Id, Label = "Color World", Href = "/blogs/color-world", SortIndex = 3 },
            new NavLink { ParentId = blogs.Id, Label = "Lifestyle & DIY", Href = "/blogs/diy", SortIndex = 4 },
            new NavLink { ParentId = blogs.Id, Label = "Product Guide", Href = "/blogs/product-guide", SortIndex = 5 }
        );

        db.FooterLinks.AddRange(
            new FooterLink { GroupKey = "info", GroupTitle = "Info", Label = "About us", Href = "/pages/about-us", SortIndex = 0 },
            new FooterLink { GroupKey = "info", GroupTitle = "Info", Label = "FAQs", Href = "/pages/faqs", SortIndex = 1 },
            new FooterLink { GroupKey = "info", GroupTitle = "Info", Label = "Blogs", Href = "/blogs/htc", SortIndex = 2 },
            new FooterLink { GroupKey = "info", GroupTitle = "Info", Label = "Gallery", Href = "/pages/gallery", SortIndex = 3 },

            new FooterLink { GroupKey = "our-book", GroupTitle = "Our book", Label = "Cute & Comfy", Href = "/collections/cute-comfy", SortIndex = 0 },
            new FooterLink { GroupKey = "our-book", GroupTitle = "Our book", Label = "Bold Easy", Href = "/collections/bold-easy", SortIndex = 1 },
            new FooterLink { GroupKey = "our-book", GroupTitle = "Our book", Label = "Classic", Href = "/collections/classic", SortIndex = 2 },
            new FooterLink { GroupKey = "our-book", GroupTitle = "Our book", Label = "Best Sellers", Href = "/collections/frontpage", SortIndex = 3 },
            new FooterLink { GroupKey = "our-book", GroupTitle = "Our book", Label = "New Release", Href = "/collections/new-release", SortIndex = 4 }
        );

        db.SocialLinks.AddRange(
            new SocialLink { Label = "Facebook", Href = "https://www.facebook.com/", SortIndex = 0 },
            new SocialLink { Label = "Instagram", Href = "https://www.instagram.com/", SortIndex = 1 },
            new SocialLink { Label = "Pinterest", Href = "https://www.pinterest.com/", SortIndex = 2 },
            new SocialLink { Label = "TikTok", Href = "https://www.tiktok.com/", SortIndex = 3 },
            new SocialLink { Label = "YouTube", Href = "https://www.youtube.com/", SortIndex = 4 },
            new SocialLink { Label = "Threads", Href = "https://www.threads.net/", SortIndex = 5 }
        );

        var terms = new[] { "spooky cuties", "girl moment", "cozy friends", "cozy days", "cozy cuties", "little corner" };
        for (int i = 0; i < terms.Length; i++)
            db.TrendingTerms.Add(new TrendingTerm { Term = terms[i], SortIndex = i });

        await db.SaveChangesAsync();
    }
}
