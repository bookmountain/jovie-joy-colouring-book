using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Data.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace JovieJoy.Api.Tests;

public class SeedContentBlocksTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public SeedContentBlocksTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Restart_seed_preserves_intentional_active_and_retired_deletions()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ContentBlocks.RemoveRange(await db.ContentBlocks.ToListAsync());
        await db.SaveChangesAsync();
        await SeedContentBlocks.RunAsync(db, initializeDefaults: true);

        var removable = await db.ContentBlocks.Where(block =>
            block.Key == "home.video" || block.Key == "home.hero.slides").ToListAsync();
        db.ContentBlocks.RemoveRange(removable);
        await db.SaveChangesAsync();

        await SeedContentBlocks.RunAsync(db);
        await SeedContentBlocks.RunAsync(db);

        Assert.False(await db.ContentBlocks.AnyAsync(block => block.Key == "home.video"));
        Assert.False(await db.ContentBlocks.AnyAsync(block => block.Key == "home.hero.slides"));
        Assert.False(await db.ContentBlocks.AnyAsync(block => block.Key == "home.hero"));
        Assert.True(await db.ContentBlocks.AnyAsync(block => block.Key == "header.brand"));
    }

    [Fact]
    public async Task Restart_seed_preserves_deletion_of_every_content_block()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ContentBlocks.RemoveRange(await db.ContentBlocks.ToListAsync());
        await db.SaveChangesAsync();
        await SeedContentBlocks.RunAsync(db, initializeDefaults: true);

        db.ContentBlocks.RemoveRange(await db.ContentBlocks.ToListAsync());
        await db.SaveChangesAsync();

        await SeedContentBlocks.RunAsync(db);

        Assert.False(await db.ContentBlocks.AnyAsync());
    }

    [Fact]
    public async Task Full_startup_seed_does_not_recreate_an_empty_content_table_in_an_established_database()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ContentBlocks.RemoveRange(await db.ContentBlocks.ToListAsync());
        if (!await db.NewsletterSubscribers.AnyAsync(subscriber => subscriber.Email == "seed-marker@example.com"))
            db.NewsletterSubscribers.Add(new NewsletterSubscriber { Email = "seed-marker@example.com" });
        await db.SaveChangesAsync();

        var hostConfiguration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var configuration = new ConfigurationBuilder()
            .AddConfiguration(hostConfiguration)
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Admin:Email"] = "content-seed-admin@example.com",
                ["Admin:Password"] = "Unique-content-seed-secret-2026!",
            })
            .Build();
        await DbSeeder.SeedAsync(db, configuration);

        Assert.False(await db.ContentBlocks.AnyAsync());
    }

    [Fact]
    public async Task Legacy_hero_slides_keep_their_mobile_asset_as_the_portrait_variant()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ContentBlocks.RemoveRange(await db.ContentBlocks.ToListAsync());
        await db.SaveChangesAsync();
        db.ContentBlocks.Add(new ContentBlock
        {
            Key = "home.hero.slides",
            Type = ContentBlockType.HomeHeroSlides,
            SortIndex = 0,
            Data = JsonDocument.Parse("""
            {
              "intervalMs": 5000,
              "slides": [
                { "label": "Both", "href": "/a", "desktop": "/uploads/a-desktop.png", "mobile": "/uploads/a-mobile.png" },
                { "label": "Same", "href": "/b", "desktop": "/uploads/b.png", "mobile": "/uploads/b.png" },
                { "label": "Mobile only", "href": "/c", "mobile": "/uploads/c-mobile.png" }
              ]
            }
            """),
        });
        await db.SaveChangesAsync();

        await SeedContentBlocks.RunAsync(db);

        db.ChangeTracker.Clear();
        var migrated = await db.ContentBlocks.SingleAsync(block => block.Key == "home.hero.slides");
        var slides = migrated.Data.RootElement.GetProperty("slides").EnumerateArray().ToArray();

        Assert.Equal("/uploads/a-desktop.png", slides[0].GetProperty("image").GetString());
        Assert.Equal("/uploads/a-mobile.png", slides[0].GetProperty("mobileImage").GetString());

        // Identical desktop/mobile collapses to a single image.
        Assert.Equal("/uploads/b.png", slides[1].GetProperty("image").GetString());
        Assert.False(slides[1].TryGetProperty("mobileImage", out _));

        // Mobile-only becomes the main image, not a portrait duplicate.
        Assert.Equal("/uploads/c-mobile.png", slides[2].GetProperty("image").GetString());
        Assert.False(slides[2].TryGetProperty("mobileImage", out _));

        foreach (var slide in slides)
        {
            Assert.False(slide.TryGetProperty("desktop", out _));
            Assert.False(slide.TryGetProperty("mobile", out _));
        }
    }

    [Fact]
    public async Task Restart_seed_preserves_an_intentionally_empty_custom_hero_carousel()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ContentBlocks.RemoveRange(await db.ContentBlocks.ToListAsync());
        await db.SaveChangesAsync();
        await SeedContentBlocks.RunAsync(db, initializeDefaults: true);
        var carousel = await db.ContentBlocks.SingleOrDefaultAsync(block => block.Key == "home.hero.slides");
        if (carousel is null)
        {
            carousel = new ContentBlock
            {
                Key = "home.hero.slides",
                Type = ContentBlockType.HomeHeroSlides,
                SortIndex = 0,
                Data = JsonDocument.Parse("""{"intervalMs":8123,"slides":[]}"""),
            };
            db.ContentBlocks.Add(carousel);
        }
        else
        {
            carousel.Data = JsonDocument.Parse("""{"intervalMs":8123,"slides":[]}""");
        }
        await db.SaveChangesAsync();

        await SeedContentBlocks.RunAsync(db);

        db.ChangeTracker.Clear();
        var preserved = await db.ContentBlocks.SingleAsync(block => block.Key == "home.hero.slides");
        Assert.Equal(8123, preserved.Data.RootElement.GetProperty("intervalMs").GetInt32());
        Assert.Empty(preserved.Data.RootElement.GetProperty("slides").EnumerateArray());
    }
}
