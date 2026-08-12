using System.Text.Json;
using JovieJoy.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Services;

public interface IAssetCleanupService
{
    Task DeleteUnreferencedAsync(IEnumerable<string?> candidates, CancellationToken ct);
    Task<IReadOnlySet<string>> ReadReferencedLocalUrlsAsync(CancellationToken ct);
}

/// <summary>
/// Deletes only local uploads that are no longer referenced anywhere in the CMS.
/// Admin DTOs intentionally allow an existing upload URL to be reused, so cleanup
/// must be global rather than assuming one file belongs to exactly one row.
/// </summary>
public sealed class AssetCleanupService(
    AppDbContext db,
    IUploadService uploads,
    ILogger<AssetCleanupService>? logger = null) : IAssetCleanupService
{
    // Stripe Checkout sessions expire within 24 hours, while delayed payment
    // methods can settle later. Keep an intentionally generous bounded window so
    // an abandoned cart cannot pin a superseded paid file forever.
    public static readonly TimeSpan PendingCheckoutFileRetention = TimeSpan.FromDays(30);

    public async Task DeleteUnreferencedAsync(IEnumerable<string?> candidates, CancellationToken ct)
    {
        try
        {
            await DeleteUnreferencedCoreAsync(candidates, ct);
        }
        catch (Exception ex)
        {
            // Every caller invokes this only after its database mutation has committed.
            // Storage cleanup is best-effort: leaving an orphan is recoverable, while
            // returning a failure for an already-persisted CMS change is misleading and
            // can make an operator repeat a destructive action.
            logger?.LogWarning(ex, "Could not complete reference-aware upload cleanup");
        }
    }

    private async Task DeleteUnreferencedCoreAsync(IEnumerable<string?> candidates, CancellationToken ct)
    {
        var localCandidates = candidates
            .Where(path => path?.StartsWith("/uploads/", StringComparison.Ordinal) == true)
            .Select(path => path!)
            .Distinct(StringComparer.Ordinal)
            .ToHashSet(StringComparer.Ordinal);
        if (localCandidates.Count == 0) return;

        var referenced = await ReadReferencedLocalUrlsAsync(ct);

        foreach (var path in localCandidates.Where(path => !referenced.Contains(path)))
            uploads.DeleteIfLocal(path);
    }

    /// <summary>
    /// Returns every local upload URL currently owned by CMS or fulfilment data.
    /// The age-gated orphan sweeper uses the same inventory as mutation cleanup so
    /// neither path can disagree about whether a file is live.
    /// </summary>
    public async Task<IReadOnlySet<string>> ReadReferencedLocalUrlsAsync(CancellationToken ct)
    {
        var referenced = new HashSet<string>(StringComparer.Ordinal);
        void Add(string? path)
        {
            if (path?.StartsWith("/uploads/", StringComparison.Ordinal) == true)
                referenced.Add(path);
        }

        foreach (var product in await db.Products.AsNoTracking().ToListAsync(ct))
        {
            foreach (var path in product.Images) Add(path);
            foreach (var path in product.ReviewImages ?? []) Add(path);
            foreach (var path in product.InspirationImages ?? []) Add(path);
            foreach (var source in product.SourceLinks ?? [])
            {
                Add(source.Image);
                Add(source.Href);
            }
            Add(product.PdfPath);
        }
        foreach (var path in await db.Collections.AsNoTracking().Select(row => row.HeroImage).ToListAsync(ct)) Add(path);
        foreach (var path in await db.AboutSections.AsNoTracking().Select(row => row.Image).ToListAsync(ct)) Add(path);
        foreach (var path in await db.BlogCategories.AsNoTracking().Select(row => row.Image).ToListAsync(ct)) Add(path);
        foreach (var path in await db.Articles.AsNoTracking().Select(row => row.Image).ToListAsync(ct)) Add(path);
        foreach (var path in await db.GalleryImages.AsNoTracking().Select(row => row.Src).ToListAsync(ct)) Add(path);
        foreach (var row in await db.FeaturedOnLinks.AsNoTracking()
                     .Select(row => new { row.Image, row.Href })
                     .ToListAsync(ct))
        {
            Add(row.Image);
            Add(row.Href);
        }
        foreach (var row in await db.Freebies.AsNoTracking().Select(row => new { row.CoverImage, row.FilePath }).ToListAsync(ct))
        {
            Add(row.CoverImage);
            Add(row.FilePath);
        }
        var now = DateTime.UtcNow;
        foreach (var path in await db.ProductDownloadGrants.AsNoTracking()
                     .Where(row => row.Order.Status == Data.Entities.OrderStatus.Paid && row.ExpiresAt >= now)
                     .Select(row => row.FilePath)
                     .ToListAsync(ct))
            Add(path);
        var pendingCutoff = now - PendingCheckoutFileRetention;
        foreach (var path in await db.OrderItems.AsNoTracking()
                     .Where(row => row.Order.Status == Data.Entities.OrderStatus.Pending &&
                                   row.Order.CreatedAt >= pendingCutoff)
                     .Select(row => row.DigitalFilePathAtPurchase)
                     .ToListAsync(ct))
            Add(path);
        foreach (var images in await db.Comics.AsNoTracking().Select(row => row.Images).ToListAsync(ct))
            foreach (var image in images) Add(image.Src);
        foreach (var path in await db.NavLinks.AsNoTracking().Select(row => row.Href).ToListAsync(ct)) Add(path);
        foreach (var path in await db.FooterLinks.AsNoTracking().Select(row => row.Href).ToListAsync(ct)) Add(path);
        foreach (var path in await db.SocialLinks.AsNoTracking().Select(row => row.Href).ToListAsync(ct)) Add(path);
        foreach (var links in await db.Faqs.AsNoTracking().Select(row => row.Links).ToListAsync(ct))
            foreach (var link in links ?? []) Add(link.Href);
        foreach (var data in await db.ContentBlocks.AsNoTracking().Select(row => row.Data).ToListAsync(ct))
            AddJsonStrings(data.RootElement, Add);

        return referenced;
    }

    public static IReadOnlyList<string> LocalUrls(JsonElement element)
    {
        var urls = new List<string>();
        AddJsonStrings(element, value =>
        {
            if (value?.StartsWith("/uploads/", StringComparison.Ordinal) == true) urls.Add(value);
        });
        return urls;
    }

    private static void AddJsonStrings(JsonElement element, Action<string?> add)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.String:
                add(element.GetString());
                break;
            case JsonValueKind.Array:
                foreach (var child in element.EnumerateArray()) AddJsonStrings(child, add);
                break;
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject()) AddJsonStrings(property.Value, add);
                break;
        }
    }
}
