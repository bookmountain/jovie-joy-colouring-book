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
        var existing = (await db.SiteContents.Select(c => c.Key).ToListAsync()).ToHashSet();
        var now = DateTime.UtcNow;

        var defaults = new List<SiteContent>
        {
            // Marquee
            new() { Key = "marquee.1", Value = "🎨 Instant PDF download", Type = "text", UpdatedAt = now },
            new() { Key = "marquee.2", Value = "💌 Free colouring pack for signup", Type = "text", UpdatedAt = now },
            new() { Key = "marquee.3", Value = "🖍 Printed in-home 1000s of times", Type = "text", UpdatedAt = now },
            new() { Key = "marquee.4", Value = "📦 No shipping — print from anywhere", Type = "text", UpdatedAt = now },
            new() { Key = "marquee.5", Value = "✨ Made by parents, for parents", Type = "text", UpdatedAt = now },
            // Home — hero
            new() { Key = "home.announcement",         Value = "Leaving Etsy · Lower prices, bigger smiles", Type = "text", UpdatedAt = now },
            new() { Key = "home.hero.tagline",          Value = "Printable\ncolouring\nbooks for\ntiny hands.", Type = "text", UpdatedAt = now },
            new() { Key = "home.hero.subtext",          Value = "Instant-download PDFs made by parents who were tired of the algorithm. Print as many times as you like, keep the file forever, and colour quiet rainy afternoons away.", Type = "text", UpdatedAt = now },
            // Home — how it works
            new() { Key = "home.steps.1.title",        Value = "Pick a book", Type = "text", UpdatedAt = now },
            new() { Key = "home.steps.1.desc",         Value = "Browse by age, theme, or pure vibes. Every book is 36–52 pages of colour-ready fun.", Type = "text", UpdatedAt = now },
            new() { Key = "home.steps.2.title",        Value = "Pay once", Type = "text", UpdatedAt = now },
            new() { Key = "home.steps.2.desc",         Value = "No subscriptions. No mailing lists unless you ask. $8–11 gets you the whole PDF, forever.", Type = "text", UpdatedAt = now },
            new() { Key = "home.steps.3.title",        Value = "Print forever", Type = "text", UpdatedAt = now },
            new() { Key = "home.steps.3.desc",         Value = "Rainy day? Birthday party? Waiting room? Print fresh pages whenever. The file is yours.", Type = "text", UpdatedAt = now },
            // Home — testimonials
            new() { Key = "home.testimonial.1.quote",  Value = "My 4yo asked for \"the bunny book\" every single car ride. Best $8 ever spent.", Type = "text", UpdatedAt = now },
            new() { Key = "home.testimonial.1.author", Value = "Priya · mom of 2", Type = "text", UpdatedAt = now },
            new() { Key = "home.testimonial.2.quote",  Value = "Printed Space Cadet Club 11 times for a birthday party. Kids obsessed.", Type = "text", UpdatedAt = now },
            new() { Key = "home.testimonial.2.author", Value = "Marc · dad of 1", Type = "text", UpdatedAt = now },
            new() { Key = "home.testimonial.3.quote",  Value = "Honestly the only screen-free activity that lasts longer than 6 minutes.", Type = "text", UpdatedAt = now },
            new() { Key = "home.testimonial.3.author", Value = "Taylor · mom of 3", Type = "text", UpdatedAt = now },
            new() { Key = "home.testimonial.4.quote",  Value = "Art teacher here — I use these as warm-ups. Kids love the line quality.", Type = "text", UpdatedAt = now },
            new() { Key = "home.testimonial.4.author", Value = "Ms. Lena · K–2 art", Type = "text", UpdatedAt = now },
            // Home — freebie CTA section
            new() { Key = "home.freebie.tagline",      Value = "psst — freebie inside", Type = "text", UpdatedAt = now },
            new() { Key = "home.freebie.headline",     Value = "5 pages,\non the house.", Type = "text", UpdatedAt = now },
            new() { Key = "home.freebie.subtext",      Value = "Pop your email in and we'll send you a sample pack — one from each of our best-selling books. See the quality before you buy.", Type = "text", UpdatedAt = now },
            // About — existing
            new() { Key = "about.headline",            Value = "Two parents, a kitchen table, lots of crayons.", Type = "text", UpdatedAt = now },
            new() { Key = "about.intro",               Value = "Jovie Joy started in 2023 when Mel and Ross couldn't find colouring pages they actually liked for their daughter Jovie (hi, namesake!). So they drew their own. Then their friends asked for copies. Then the friends' friends did. Eventually they put them on Etsy.", Type = "text", UpdatedAt = now },
            new() { Key = "about.photo.1",             Value = "", Type = "image", UpdatedAt = now },
            new() { Key = "about.photo.2",             Value = "", Type = "image", UpdatedAt = now },
            new() { Key = "about.photo.3",             Value = "", Type = "image", UpdatedAt = now },
            // About — photo captions
            new() { Key = "about.photo.1.caption",    Value = "studio photo: mel and ross at the kitchen table", Type = "text", UpdatedAt = now },
            new() { Key = "about.photo.2.caption",    Value = "studio photo: printer + drawing tools", Type = "text", UpdatedAt = now },
            new() { Key = "about.photo.3.caption",    Value = "studio photo: jovie (2y old) colouring", Type = "text", UpdatedAt = now },
            // About — Etsy section
            new() { Key = "about.etsy.para1",         Value = "Etsy was good to us for a while. But two things wore us down: one, the algorithm decided whether parents could find us — regardless of how good the work was. Two, every time Etsy ran a sale, we were encouraged to undercut our own prices to \"stay competitive.\" It didn't feel good, and it didn't pay the bills.", Type = "text", UpdatedAt = now },
            new() { Key = "about.etsy.para2",         Value = "So we built our own shop. Now you pay less (no 6% Etsy fee), we make more, and we get to actually talk with the parents who use our books. Win-win-win.", Type = "text", UpdatedAt = now },
            // About — stats
            new() { Key = "about.stat.1.n",           Value = "2,400+", Type = "text", UpdatedAt = now },
            new() { Key = "about.stat.1.l",           Value = "books sold", Type = "text", UpdatedAt = now },
            new() { Key = "about.stat.2.n",           Value = "180+", Type = "text", UpdatedAt = now },
            new() { Key = "about.stat.2.l",           Value = "5-star reviews", Type = "text", UpdatedAt = now },
            new() { Key = "about.stat.3.n",           Value = "14,000", Type = "text", UpdatedAt = now },
            new() { Key = "about.stat.3.l",           Value = "pages printed (that we know of)", Type = "text", UpdatedAt = now },
            // About — promise cards
            new() { Key = "about.promise.1.title",    Value = "No AI", Type = "text", UpdatedAt = now },
            new() { Key = "about.promise.1.desc",     Value = "Every page is hand-drawn by Mel. No generative anything. Ever.", Type = "text", UpdatedAt = now },
            new() { Key = "about.promise.2.title",    Value = "No subscriptions", Type = "text", UpdatedAt = now },
            new() { Key = "about.promise.2.desc",     Value = "Pay once, own it forever. No renewals, no emails unless you want them.", Type = "text", UpdatedAt = now },
            new() { Key = "about.promise.3.title",    Value = "No ads in your inbox", Type = "text", UpdatedAt = now },
            new() { Key = "about.promise.3.desc",     Value = "One email a month, tops. You can unsubscribe any time with one click.", Type = "text", UpdatedAt = now },
            new() { Key = "about.promise.4.title",    Value = "Real humans", Type = "text", UpdatedAt = now },
            new() { Key = "about.promise.4.desc",     Value = "Email us at hello@joviejoy.com — Ross replies within a day, usually same-day.", Type = "text", UpdatedAt = now },
            // Freebie page
            new() { Key = "freebie.tagline",           Value = "on the house", Type = "text", UpdatedAt = now },
            new() { Key = "freebie.headline",          Value = "Free\ncolouring\npack ✿", Type = "text", UpdatedAt = now },
            new() { Key = "freebie.subtext",           Value = "5 hand-picked pages from our best-selling books — yours to print as many times as you'd like. Try before you buy, no credit card, no weird catches.", Type = "text", UpdatedAt = now },
            // FAQ
            new() { Key = "faq.1.q", Value = "How does the download work?", Type = "text", UpdatedAt = now },
            new() { Key = "faq.1.a", Value = "After checkout you'll get an instant email with your PDF link. You can also download it straight from the confirmation page. The file is yours — redownload anytime from your account.", Type = "text", UpdatedAt = now },
            new() { Key = "faq.2.q", Value = "Can I print these as many times as I want?", Type = "text", UpdatedAt = now },
            new() { Key = "faq.2.a", Value = "Yes! That's the whole point. Spill juice on page 7? Print another. Want copies for the whole classroom? Go for it (up to 30 kids per license).", Type = "text", UpdatedAt = now },
            new() { Key = "faq.3.q", Value = "What printer should I use?", Type = "text", UpdatedAt = now },
            new() { Key = "faq.3.a", Value = "Any home printer works. We design with inkjet in mind but laser is great too. Standard 8.5×11 US Letter, or pop into A4 mode for A4 paper.", Type = "text", UpdatedAt = now },
            new() { Key = "faq.4.q", Value = "Why did you leave Etsy?", Type = "text", UpdatedAt = now },
            new() { Key = "faq.4.a", Value = "Short answer: we wanted to talk to you directly, without an algorithm deciding whether you saw us. Long answer: on our About page.", Type = "text", UpdatedAt = now },
            new() { Key = "faq.5.q", Value = "Can I get a refund?", Type = "text", UpdatedAt = now },
            new() { Key = "faq.5.a", Value = "Since these are digital, we can't \"take them back\" — but if something's wrong with your file, email us within 14 days and we'll make it right. Always.", Type = "text", UpdatedAt = now },
        };

        var toAdd = defaults.Where(d => !existing.Contains(d.Key)).ToList();
        if (toAdd.Count > 0)
        {
            db.SiteContents.AddRange(toAdd);
            await db.SaveChangesAsync();
        }
    }
}
