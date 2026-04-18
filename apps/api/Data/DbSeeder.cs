using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data;

// Seeds products, admin user, and default site content. Idempotent — only inserts missing rows.
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, IConfiguration config)
    {
        await SeedProductsAsync(db);
        await SeedAdminAsync(db, config);
        await SeedSiteContentAsync(db);
    }

    private static async Task SeedProductsAsync(AppDbContext db)
    {
        if (await db.Products.AnyAsync()) return;

        var now = DateTime.UtcNow;
        db.Products.AddRange(
            new Product { Id = "p01", Title = "Sleepy Safari",       PriceCents = 800,  Pages = 36, AgeRange = "3-5",  Theme = "Animals",   Difficulty = "Easy",   Color = "#FFC94A", Accent = "#FF6A4D", Badge = "Bestseller", Description = "Gentle jungle friends for littlest hands — big shapes, bold outlines.", CreatedAt = now },
            new Product { Id = "p02", Title = "Ocean Giggles",       PriceCents = 900,  Pages = 42, AgeRange = "5-8",  Theme = "Ocean",     Difficulty = "Easy",   Color = "#7EC8E3", Accent = "#D94C8B", Badge = "New",        Description = "Dolphins, octopi & bubbly patterns. Splashy fun for early colourers.", CreatedAt = now },
            new Product { Id = "p03", Title = "Dino Doodle Dash",    PriceCents = 1000, Pages = 48, AgeRange = "5-8",  Theme = "Dinosaurs", Difficulty = "Medium", Color = "#9DD4A9", Accent = "#231F1A",                       Description = "T-Rex, triceratops and puzzle mazes stomping across 48 pages.", CreatedAt = now },
            new Product { Id = "p04", Title = "Fairy Tea Party",     PriceCents = 900,  Pages = 40, AgeRange = "3-5",  Theme = "Fantasy",   Difficulty = "Easy",   Color = "#D94C8B", Accent = "#FFC94A",                       Description = "Tiny teapots, toadstools and winged things having a lovely afternoon.", CreatedAt = now },
            new Product { Id = "p05", Title = "Space Cadet Club",    PriceCents = 1100, Pages = 52, AgeRange = "8-12", Theme = "Space",     Difficulty = "Hard",   Color = "#C9A9E0", Accent = "#7EC8E3", Badge = "Bestseller", Description = "Rocketships, planets and astronaut cats. For patient rocket scientists.", CreatedAt = now },
            new Product { Id = "p06", Title = "Farmyard Friends",    PriceCents = 800,  Pages = 36, AgeRange = "3-5",  Theme = "Animals",   Difficulty = "Easy",   Color = "#FFC94A", Accent = "#9DD4A9",                       Description = "A cow, a duck, a happy pig. Classic barnyard for calm afternoons.", CreatedAt = now },
            new Product { Id = "p07", Title = "Robot Repair Shop",   PriceCents = 1000, Pages = 44, AgeRange = "5-8",  Theme = "Robots",    Difficulty = "Medium", Color = "#7EC8E3", Accent = "#231F1A",                       Description = "Bolts, gears and googly-eyed bots. For builders and tinkerers.", CreatedAt = now },
            new Product { Id = "p08", Title = "Garden of Goodnight", PriceCents = 900,  Pages = 38, AgeRange = "5-8",  Theme = "Nature",    Difficulty = "Medium", Color = "#9DD4A9", Accent = "#D94C8B",                       Description = "Bedtime flowers, owls and moons for calming wind-down time.", CreatedAt = now },
            new Product { Id = "p09", Title = "Cupcake Kingdom",     PriceCents = 800,  Pages = 36, AgeRange = "3-5",  Theme = "Food",      Difficulty = "Easy",   Color = "#D94C8B", Accent = "#FFC94A",                       Description = "Sprinkle castles, donut moats, and a king-sized éclair on his throne.", CreatedAt = now },
            new Product { Id = "p10", Title = "Mermaid Mystery",     PriceCents = 1100, Pages = 50, AgeRange = "8-12", Theme = "Ocean",     Difficulty = "Hard",   Color = "#7EC8E3", Accent = "#C9A9E0", Badge = "New",        Description = "Intricate scales, coral cathedrals, and hidden pearls to find.", CreatedAt = now },
            new Product { Id = "p11", Title = "Construction Crew",   PriceCents = 900,  Pages = 40, AgeRange = "3-5",  Theme = "Vehicles",  Difficulty = "Easy",   Color = "#FFC94A", Accent = "#231F1A",                       Description = "Diggers, dumpers and cranes. For kids who point at trucks.", CreatedAt = now },
            new Product { Id = "p12", Title = "Unicorn Daydream",    PriceCents = 1000, Pages = 46, AgeRange = "5-8",  Theme = "Fantasy",   Difficulty = "Medium", Color = "#C9A9E0", Accent = "#FFC94A",                       Description = "Rainbows, stars and one very fluffy unicorn. Enough said.", CreatedAt = now }
        );
        await db.SaveChangesAsync();
    }

    private static async Task SeedAdminAsync(AppDbContext db, IConfiguration config)
    {
        var adminEmail = config["Admin:Email"] ?? "admin@joviejoy.com";
        if (await db.Users.AnyAsync(u => u.Email == adminEmail && u.IsAdmin)) return;

        var adminPassword = config["Admin:Password"] ?? "changeme123";
        db.Users.Add(new User
        {
            Email = adminEmail,
            Name = "Admin",
            IsAdmin = true,
            PasswordHash = PasswordHasher.Hash(adminPassword),
        });
        await db.SaveChangesAsync();
    }

    private static async Task SeedSiteContentAsync(AppDbContext db)
    {
        if (await db.SiteContents.AnyAsync()) return;

        var now = DateTime.UtcNow;
        db.SiteContents.AddRange(
            new SiteContent { Key = "home.announcement",    Value = "Leaving Etsy · Lower prices, bigger smiles", Type = "text", UpdatedAt = now },
            new SiteContent { Key = "home.hero.tagline",    Value = "Printable colouring books for tiny hands.", Type = "text", UpdatedAt = now },
            new SiteContent { Key = "home.hero.subtext",    Value = "Instant-download PDFs made by parents who were tired of the algorithm. Print as many times as you like, keep the file forever, and colour quiet rainy afternoons away.", Type = "text", UpdatedAt = now },
            new SiteContent { Key = "about.headline",       Value = "Two parents, a kitchen table, lots of crayons.", Type = "text", UpdatedAt = now },
            new SiteContent { Key = "about.intro",          Value = "Jovie Joy started in 2023 when Mel and Ross couldn't find colouring pages they actually liked for their daughter Jovie. So they drew their own.", Type = "text", UpdatedAt = now },
            new SiteContent { Key = "about.photo.1",        Value = "", Type = "image", UpdatedAt = now },
            new SiteContent { Key = "about.photo.2",        Value = "", Type = "image", UpdatedAt = now },
            new SiteContent { Key = "about.photo.3",        Value = "", Type = "image", UpdatedAt = now }
        );
        await db.SaveChangesAsync();
    }
}
