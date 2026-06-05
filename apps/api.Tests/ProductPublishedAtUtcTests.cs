using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Tests;

/// <summary>
/// Regression test for the admin "Publish" 500: the form sends publishedAt as a
/// bare date ("2026-06-05") which deserialises to DateTime Kind=Unspecified.
/// Npgsql rejects Kind=Unspecified when writing a `timestamp with time zone`
/// column, surfacing as a DbUpdateException ("An error occurred while saving the
/// entity changes"). The model's value converter must normalise it to UTC.
///
/// The app's integration tests run on the EF in-memory provider, which accepts
/// any DateTime Kind, so this test builds the real Npgsql model (no connection is
/// opened just to construct the model) and inspects the converter directly.
/// </summary>
public class ProductPublishedAtUtcTests
{
    private static AppDbContext BuildNpgsqlContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=ignored;Database=ignored;Username=ignored;Password=ignored")
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public void PublishedAt_converts_unspecified_kind_to_utc()
    {
        using var db = BuildNpgsqlContext();
        var converter = db.Model
            .FindEntityType(typeof(Product))!
            .FindProperty(nameof(Product.PublishedAt))!
            .GetValueConverter();

        Assert.NotNull(converter);

        var bareDate = new DateTime(2026, 6, 5, 0, 0, 0, DateTimeKind.Unspecified);
        var stored = (DateTime?)converter!.ConvertToProvider(bareDate);

        Assert.NotNull(stored);
        Assert.Equal(DateTimeKind.Utc, stored!.Value.Kind);
        Assert.Equal(new DateTime(2026, 6, 5, 0, 0, 0, DateTimeKind.Utc), stored.Value);
    }

    [Fact]
    public void PublishedAt_passes_null_through()
    {
        using var db = BuildNpgsqlContext();
        var converter = db.Model
            .FindEntityType(typeof(Product))!
            .FindProperty(nameof(Product.PublishedAt))!
            .GetValueConverter();

        Assert.NotNull(converter);
        Assert.Null(converter!.ConvertToProvider(null));
    }
}
