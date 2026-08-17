using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Data.Seed;
using JovieJoy.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Net.Mail;

namespace JovieJoy.Api.Data;

public static class DbSeeder
{
    public const int CurrentDefaultsVersion = 2;
    public const int MinimumAdminPasswordLength = 16;

    private const string DefaultsStateKey = "cms-defaults";
    private const long PostgresSeedLockId = 0x4A6F766965536565L; // "JovieSee"

    public static async Task SeedAsync(AppDbContext db, IConfiguration config)
    {
        try
        {
            if (db.Database.IsRelational())
            {
                // Each default seeder saves independently. Keep those saves in one
                // transaction so a crash cannot leave enough rows behind to make the
                // next startup mistake a partial first-time seed for an established DB.
                await using var transaction = await db.Database.BeginTransactionAsync();

                if (db.Database.IsNpgsql())
                {
                    // Serialise startup across app instances. The lock is bound to
                    // this transaction and is automatically released on rollback.
                    await db.Database.ExecuteSqlInterpolatedAsync(
                        $"SELECT pg_advisory_xact_lock({PostgresSeedLockId})");
                }

                // Classification, defaults, admin creation, and marker creation all
                // happen after the lock in this transaction. Concurrent fresh app
                // instances therefore cannot race the unique admin insert.
                await SeedDefaultsAdminAndMarkCompletedAsync(db, config);
                await transaction.CommitAsync();
            }
            else
            {
                // EF's in-memory provider used by tests does not support transactions.
                await SeedDefaultsAdminAndMarkCompletedAsync(db, config);
            }
        }
        catch
        {
            // A relational transaction is rolled back before this catch runs. Remove
            // its now-stale tracked entities as well so the context can be retried.
            // Non-relational providers remain responsible for durability semantics.
            db.ChangeTracker.Clear();
            throw;
        }

    }

    private static async Task SeedDefaultsAdminAndMarkCompletedAsync(
        AppDbContext db,
        IConfiguration config)
    {
        // Validate bootstrap credentials before writing any defaults. This makes a
        // fresh deployment with missing or unsafe credentials fail closed without
        // leaving partial seed data behind (including for non-transactional tests).
        var adminCredentials = await ResolveAdminBootstrapCredentialsAsync(db, config);

        var state = await db.SeedStates.SingleOrDefaultAsync(x => x.Key == DefaultsStateKey);
        var initializeDefaults = false;

        if (state is null)
        {
            if (await DefaultSeedCompatibility.IsCompletelyEmptyAsync(db))
            {
                initializeDefaults = true;
            }
            else if (await DefaultSeedCompatibility.IsSafelyRecoverableLegacyPartialAsync(db))
            {
                // Some pre-marker seeders saved more than once. Reset only when the
                // whole database matches a known interrupted seed prefix; otherwise
                // preserve the markerless database as established.
                await DefaultSeedCompatibility.ClearSeedManagedDataAsync(db);
                initializeDefaults = true;
            }
        }

        // Existing markerless databases deliberately run the same pipeline with
        // initialization disabled. Compatibility migrations still run, but an empty
        // CMS section is not backfilled merely because it is empty.
        await SeedDefaultsAsync(db, initializeDefaults);
        await SeedAdminAsync(db, adminCredentials);

        // This is intentionally the final write in the serialized transaction. A
        // marker can never commit for partial defaults or failed admin creation.
        if (state is null)
        {
            db.SeedStates.Add(new SeedState
            {
                Key = DefaultsStateKey,
                Version = CurrentDefaultsVersion,
                CompletedAtUtc = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }
        else if (state.Version < CurrentDefaultsVersion)
        {
            // v2 introduced the site.modules toggle block. Databases seeded
            // before it get the disabled-shop default exactly once; deleting
            // or editing the block afterwards is a CMS decision that later
            // restarts must respect, hence the marker bump in the same save.
            if (state.Version < 2)
                await SeedContentBlocks.AddSiteModulesDefaultAsync(db);

            state.Version = CurrentDefaultsVersion;
            state.CompletedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
    }

    private static async Task SeedDefaultsAsync(AppDbContext db, bool initializeDefaults)
    {
        await SeedContentBlocks.RunAsync(db, initializeDefaults);
        await SeedProducts.RunAsync(db, initializeDefaults);
        await SeedFreebies.RunAsync(db, initializeDefaults);
        await SeedCollections.RunAsync(db, initializeDefaults);
        await SeedBlogs.RunAsync(db, initializeDefaults);
        await SeedComics.RunAsync(db, initializeDefaults);
        await SeedAbout.RunAsync(db, initializeDefaults);
        await SeedGallery.RunAsync(db, initializeDefaults);
        await SeedNavigation.RunAsync(db, initializeDefaults);
        await SeedPages.RunAsync(db, initializeDefaults);
        await SeedFaqs.RunAsync(db, initializeDefaults);
        await SeedFeaturedOn.RunAsync(db, initializeDefaults);
    }

    private static async Task<AdminBootstrapCredentials?> ResolveAdminBootstrapCredentialsAsync(
        AppDbContext db,
        IConfiguration config)
    {
        // Bootstrap configuration is irrelevant once any administrator exists.
        // This also prevents a stale environment value from creating a second
        // privileged account after ownership has moved to another email address.
        if (await db.Users.AnyAsync(u => u.IsAdmin)) return null;

        var configuredEmail = config["Admin:Email"]?.Trim();

        if (string.IsNullOrWhiteSpace(configuredEmail))
        {
            throw new InvalidOperationException(
                "No administrator exists. Set Admin__Email and Admin__Password to " +
                "explicit, unique bootstrap credentials before starting the API.");
        }

        if (!IsValidEmailAddress(configuredEmail))
        {
            throw new InvalidOperationException(
                "Admin__Email must be a valid email address before the API can " +
                "bootstrap an administrator.");
        }

        var configuredPassword = config["Admin:Password"];
        if (string.IsNullOrWhiteSpace(configuredPassword))
        {
            throw new InvalidOperationException(
                "No administrator exists with Admin__Email. Set Admin__Password to " +
                $"a unique password of at least {MinimumAdminPasswordLength} characters.");
        }

        ValidateAdminPassword(configuredPassword);
        return new AdminBootstrapCredentials(configuredEmail, configuredPassword);
    }

    private static async Task SeedAdminAsync(
        AppDbContext db,
        AdminBootstrapCredentials? credentials)
    {
        if (credentials is null) return;

        db.Users.Add(new User
        {
            Email = credentials.Email,
            Name = "Admin",
            IsAdmin = true,
            PasswordHash = PasswordHasher.Hash(credentials.Password),
        });
        await db.SaveChangesAsync();
    }

    private static bool IsValidEmailAddress(string value)
    {
        try
        {
            var parsed = new MailAddress(value);
            return string.Equals(parsed.Address, value, StringComparison.OrdinalIgnoreCase);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static void ValidateAdminPassword(string password)
    {
        var normalized = new string(password
            .Where(char.IsLetterOrDigit)
            .Select(char.ToLowerInvariant)
            .ToArray());

        var containsUnsafePlaceholder = new[]
        {
            "changeme",
            "password",
            "replace",
            "example",
            "generate",
            "admin123",
            "qwerty",
        }.Any(normalized.Contains);

        if (password.Length < MinimumAdminPasswordLength ||
            password.Distinct().Count() < 4 ||
            containsUnsafePlaceholder)
        {
            throw new InvalidOperationException(
                $"Admin__Password must be at least {MinimumAdminPasswordLength} " +
                "characters, must not be a common/default password or placeholder, " +
                "and should be generated uniquely for this deployment.");
        }
    }

    private sealed record AdminBootstrapCredentials(string Email, string Password);
}
