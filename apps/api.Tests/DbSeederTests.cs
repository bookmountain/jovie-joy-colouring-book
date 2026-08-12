using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

namespace JovieJoy.Api.Tests;

public class DbSeederTests
{
    [Fact]
    public async Task Fresh_database_without_admin_credentials_fails_before_writing_seed_data()
    {
        await using var db = CreateContext();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            DbSeeder.SeedAsync(db, CreateEmptyConfiguration()));

        Assert.Contains("Admin__Email", error.Message);
        Assert.Empty(await db.Users.AsNoTracking().ToListAsync());
        Assert.Empty(await db.Products.AsNoTracking().ToListAsync());
        Assert.Empty(await db.ContentBlocks.AsNoTracking().ToListAsync());
        Assert.Empty(await db.SeedStates.AsNoTracking().ToListAsync());
    }

    [Theory]
    [InlineData("changeme123")]
    [InlineData("change_me")]
    [InlineData("password-password")]
    [InlineData("REPLACE_WITH_A_SECRET")]
    [InlineData("aaaaaaaaaaaaaaaa")]
    public async Task Fresh_database_rejects_weak_or_placeholder_admin_passwords(string password)
    {
        await using var db = CreateContext();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Admin:Email"] = "admin@example.com",
                ["Admin:Password"] = password,
            })
            .Build();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            DbSeeder.SeedAsync(db, configuration));

        Assert.Contains("Admin__Password", error.Message);
        Assert.Empty(await db.Users.AsNoTracking().ToListAsync());
        Assert.Empty(await db.SeedStates.AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task Established_database_with_an_admin_does_not_require_bootstrap_credentials()
    {
        await using var db = CreateContext();
        db.Users.Add(new User
        {
            Email = "owner@example.com",
            Name = "Owner",
            IsAdmin = true,
            PasswordHash = "existing-hash",
        });
        await db.SaveChangesAsync();

        await DbSeeder.SeedAsync(db, CreateEmptyConfiguration());

        var admin = Assert.Single(await db.Users.AsNoTracking().ToListAsync());
        Assert.Equal("owner@example.com", admin.Email);
        Assert.Equal(
            DbSeeder.CurrentDefaultsVersion,
            Assert.Single(await db.SeedStates.AsNoTracking().ToListAsync()).Version);
    }

    [Fact]
    public async Task Established_database_ignores_stale_bootstrap_email_and_does_not_create_second_admin()
    {
        await using var db = CreateContext();
        db.Users.Add(new User
        {
            Email = "owner@example.com",
            Name = "Owner",
            IsAdmin = true,
            PasswordHash = "existing-hash",
        });
        await db.SaveChangesAsync();
        var staleConfiguration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Admin:Email"] = "old-bootstrap@example.com",
                ["Admin:Password"] = "changeme123",
            })
            .Build();

        await DbSeeder.SeedAsync(db, staleConfiguration);

        var admin = Assert.Single(await db.Users.AsNoTracking().Where(u => u.IsAdmin).ToListAsync());
        Assert.Equal("owner@example.com", admin.Email);
    }

    [Fact]
    public async Task Fresh_database_rejects_invalid_admin_email()
    {
        await using var db = CreateContext();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Admin:Email"] = "not-an-email",
                ["Admin:Password"] = "Unique-bootstrap-secret-2026!",
            })
            .Build();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            DbSeeder.SeedAsync(db, configuration));

        Assert.Contains("Admin__Email", error.Message);
        Assert.Empty(await db.Users.AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task Restart_does_not_recreate_intentionally_emptied_cms_sections()
    {
        await using var db = CreateContext();
        var configuration = CreateConfiguration();
        await DbSeeder.SeedAsync(db, configuration);

        db.ProductCollections.RemoveRange(await db.ProductCollections.ToListAsync());
        db.Products.RemoveRange(await db.Products.ToListAsync());
        db.Collections.RemoveRange(await db.Collections.ToListAsync());
        db.Articles.RemoveRange(await db.Articles.ToListAsync());
        db.BlogCategories.RemoveRange(await db.BlogCategories.ToListAsync());
        db.Comics.RemoveRange(await db.Comics.ToListAsync());
        db.ComicWorlds.RemoveRange(await db.ComicWorlds.ToListAsync());
        db.AboutSections.RemoveRange(await db.AboutSections.ToListAsync());
        db.GalleryImages.RemoveRange(await db.GalleryImages.ToListAsync());
        db.StaticPages.RemoveRange(await db.StaticPages.ToListAsync());
        db.NavLinks.RemoveRange(await db.NavLinks.ToListAsync());
        db.FooterLinks.RemoveRange(await db.FooterLinks.ToListAsync());
        db.SocialLinks.RemoveRange(await db.SocialLinks.ToListAsync());
        db.FeaturedOnLinks.RemoveRange(await db.FeaturedOnLinks.ToListAsync());
        db.TrendingTerms.RemoveRange(await db.TrendingTerms.ToListAsync());
        db.Faqs.RemoveRange(await db.Faqs.ToListAsync());
        db.FreebieRequests.RemoveRange(await db.FreebieRequests.ToListAsync());
        db.Freebies.RemoveRange(await db.Freebies.ToListAsync());
        db.ContentBlocks.RemoveRange(await db.ContentBlocks.ToListAsync());
        await db.SaveChangesAsync();

        await DbSeeder.SeedAsync(db, configuration);

        Assert.Empty(await db.Products.ToListAsync());
        Assert.Empty(await db.Collections.ToListAsync());
        Assert.Empty(await db.BlogCategories.ToListAsync());
        Assert.Empty(await db.ComicWorlds.ToListAsync());
        Assert.Empty(await db.AboutSections.ToListAsync());
        Assert.Empty(await db.GalleryImages.ToListAsync());
        Assert.Empty(await db.StaticPages.ToListAsync());
        Assert.Empty(await db.NavLinks.ToListAsync());
        Assert.Empty(await db.FooterLinks.ToListAsync());
        Assert.Empty(await db.SocialLinks.ToListAsync());
        Assert.Empty(await db.FeaturedOnLinks.ToListAsync());
        Assert.Empty(await db.TrendingTerms.ToListAsync());
        Assert.Empty(await db.Faqs.ToListAsync());
        Assert.Empty(await db.Freebies.ToListAsync());
        Assert.Empty(await db.ContentBlocks.ToListAsync());
        Assert.Equal(
            DbSeeder.CurrentDefaultsVersion,
            Assert.Single(await db.SeedStates.ToListAsync()).Version);
    }

    [Fact]
    public async Task Fresh_seed_does_not_publish_downloads_without_real_files()
    {
        await using var db = CreateContext();

        await DbSeeder.SeedAsync(db, CreateConfiguration());

        var digitalProducts = await db.Products.AsNoTracking()
            .Where(product => product.ProductType == ProductType.Digital)
            .ToListAsync();
        Assert.NotEmpty(digitalProducts);
        Assert.All(digitalProducts, product =>
        {
            Assert.Null(product.PdfPath);
            Assert.Null(product.PublishedAt);
        });

        var seededFreebie = Assert.Single(await db.Freebies.AsNoTracking().ToListAsync());
        Assert.False(seededFreebie.Published);
        Assert.True(string.IsNullOrEmpty(seededFreebie.FilePath));
    }

    [Fact]
    public async Task Markerless_established_database_adopts_intentional_deletions_without_backfill()
    {
        await using var db = CreateContext();
        var configuration = CreateConfiguration();
        await DbSeeder.SeedAsync(db, configuration);

        db.ProductCollections.RemoveRange(await db.ProductCollections.ToListAsync());
        db.Products.RemoveRange(await db.Products.ToListAsync());
        db.Collections.RemoveRange(await db.Collections.ToListAsync());
        db.ContentBlocks.RemoveRange(await db.ContentBlocks.ToListAsync());
        db.SeedStates.RemoveRange(await db.SeedStates.ToListAsync());
        await db.SaveChangesAsync();

        // The surviving admin is durable evidence that this was an established
        // database, even though several seed-managed sections are now empty.
        await DbSeeder.SeedAsync(db, configuration);

        Assert.Empty(await db.Products.ToListAsync());
        Assert.Empty(await db.Collections.ToListAsync());
        Assert.Empty(await db.ContentBlocks.ToListAsync());
        Assert.Equal(
            DbSeeder.CurrentDefaultsVersion,
            Assert.Single(await db.SeedStates.ToListAsync()).Version);
    }

    [Fact]
    public async Task Markerless_custom_database_is_adopted_instead_of_reseeded()
    {
        await using var db = CreateContext();
        var configuration = CreateConfiguration();
        db.ContentBlocks.Add(new ContentBlock
        {
            Key = "custom.only",
            Type = ContentBlockType.HomeIntro,
            Data = JsonDocument.Parse("""{ "body": "Keep me" }"""),
        });
        await db.SaveChangesAsync();

        await DbSeeder.SeedAsync(db, configuration);

        Assert.Equal("custom.only", Assert.Single(await db.ContentBlocks.ToListAsync()).Key);
        Assert.Empty(await db.Products.ToListAsync());
        Assert.Equal(
            DbSeeder.CurrentDefaultsVersion,
            Assert.Single(await db.SeedStates.ToListAsync()).Version);
    }

    [Fact]
    public async Task Legacy_partial_seed_without_marker_is_reset_and_completed_on_retry()
    {
        var databaseName = $"seeder-recovery-{Guid.NewGuid():N}";
        var configuration = CreateConfiguration();

        // Save 7 is the article phase of the two-save blog seeder. Saves 1-6
        // remain in the in-memory store to model the old non-transactional startup.
        await using (var failingDb = new FailOnSaveNumberDbContext(CreateOptions(databaseName), 7))
        {
            await Assert.ThrowsAsync<DbUpdateException>(() =>
                DbSeeder.SeedAsync(failingDb, configuration));
        }

        await using (var partialDb = CreateContext(databaseName))
        {
            Assert.Empty(await partialDb.SeedStates.ToListAsync());
            Assert.Equal(5, await partialDb.BlogCategories.CountAsync());
            Assert.Empty(await partialDb.Articles.ToListAsync());
        }

        await using (var retryDb = CreateContext(databaseName))
        {
            await DbSeeder.SeedAsync(retryDb, configuration);
            await AssertAllDefaultsSeededAsync(retryDb);
        }
    }

    [Fact]
    public async Task Admin_failure_does_not_write_completion_marker_and_is_retried_without_duplicates()
    {
        var databaseName = $"seeder-admin-retry-{Guid.NewGuid():N}";
        var configuration = CreateConfiguration();
        int productCount;

        await using (var failingDb = new FailAdminSaveDbContext(CreateOptions(databaseName)))
        {
            await Assert.ThrowsAsync<DbUpdateException>(() =>
                DbSeeder.SeedAsync(failingDb, configuration));

            productCount = await failingDb.Products.CountAsync();
            Assert.True(productCount > 0);
            Assert.Empty(await failingDb.Users.AsNoTracking().ToListAsync());
            Assert.Empty(await failingDb.SeedStates.AsNoTracking().ToListAsync());
        }

        await using (var retryDb = CreateContext(databaseName))
        {
            await DbSeeder.SeedAsync(retryDb, configuration);

            Assert.Equal(productCount, await retryDb.Products.CountAsync());
            var admin = Assert.Single(await retryDb.Users.AsNoTracking().ToListAsync());
            Assert.True(admin.IsAdmin);
            Assert.Equal("seed-admin@example.com", admin.Email);
            Assert.Equal(
                DbSeeder.CurrentDefaultsVersion,
                Assert.Single(await retryDb.SeedStates.AsNoTracking().ToListAsync()).Version);
        }
    }

    private static async Task AssertAllDefaultsSeededAsync(AppDbContext db)
    {
        Assert.NotEmpty(await db.ContentBlocks.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.Products.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.Freebies.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.Collections.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.BlogCategories.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.Articles.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.ComicWorlds.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.Comics.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.AboutSections.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.GalleryImages.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.NavLinks.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.FooterLinks.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.SocialLinks.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.TrendingTerms.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.StaticPages.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.Faqs.AsNoTracking().ToListAsync());
        Assert.NotEmpty(await db.FeaturedOnLinks.AsNoTracking().ToListAsync());

        var admin = Assert.Single(await db.Users.AsNoTracking().ToListAsync());
        Assert.True(admin.IsAdmin);
        Assert.Equal(
            DbSeeder.CurrentDefaultsVersion,
            Assert.Single(await db.SeedStates.AsNoTracking().ToListAsync()).Version);
    }

    private static IConfiguration CreateConfiguration() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Admin:Email"] = "seed-admin@example.com",
                ["Admin:Password"] = "Unique-seed-admin-secret-2026!",
            })
            .Build();

    private static IConfiguration CreateEmptyConfiguration() =>
        new ConfigurationBuilder().Build();

    private static AppDbContext CreateContext(string? databaseName = null) =>
        new(CreateOptions(databaseName ?? $"seeder-{Guid.NewGuid():N}"));

    private static DbContextOptions<AppDbContext> CreateOptions(string databaseName) =>
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

    private sealed class FailOnSaveNumberDbContext(
        DbContextOptions<AppDbContext> options,
        int saveNumber)
        : AppDbContext(options)
    {
        private int _saveCount;

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            _saveCount++;
            return _saveCount == saveNumber
                ? Task.FromException<int>(new DbUpdateException("Injected default seed failure"))
                : base.SaveChangesAsync(cancellationToken);
        }
    }

    private sealed class FailAdminSaveDbContext(DbContextOptions<AppDbContext> options)
        : AppDbContext(options)
    {
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var addingAdmin = ChangeTracker.Entries<User>()
                .Any(entry => entry.State == EntityState.Added && entry.Entity.IsAdmin);

            return addingAdmin
                ? Task.FromException<int>(new DbUpdateException("Injected admin persistence failure"))
                : base.SaveChangesAsync(cancellationToken);
        }
    }
}
