using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Data.Seed;
using JovieJoy.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, IConfiguration config)
    {
        await SeedProducts.RunAsync(db);
        await SeedCollections.RunAsync(db);
        await SeedContentBlocks.RunAsync(db);
        await SeedBlogs.RunAsync(db);
        await SeedComics.RunAsync(db);
        await SeedAbout.RunAsync(db);
        await SeedGallery.RunAsync(db);
        await SeedNavigation.RunAsync(db);
        await SeedPages.RunAsync(db);
        await SeedFaqs.RunAsync(db);
        await SeedFeaturedOn.RunAsync(db);
        await SeedAdminAsync(db, config);
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
}
