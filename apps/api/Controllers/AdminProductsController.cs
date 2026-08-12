using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/admin/products")]
[Authorize(Policy = "AdminOnly")]
public class AdminProductsController(
    AppDbContext db,
    IUploadService uploads,
    IAssetCleanupService assetCleanup) : ControllerBase
{
    public const int MaxBulkProducts = 100;

    [HttpGet]
    public async Task<ActionResult<AdminProductListResponse>> List(
        [FromQuery] string? q,
        [FromQuery] string? format,
        [FromQuery] string? status,
        [FromQuery] string? collection,
        [FromQuery] string? tag,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Products.AsNoTracking()
            .Include(p => p.ProductCollections).ThenInclude(pc => pc.Collection)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(format))
        {
            var formats = format.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(f => Enum.TryParse<ProductType>(f, ignoreCase: true, out var pt) ? (ProductType?)pt : null)
                .Where(pt => pt.HasValue).Select(pt => pt!.Value).ToList();
            if (formats.Count > 0) query = query.Where(p => formats.Contains(p.ProductType));
        }

        if (!string.IsNullOrWhiteSpace(collection))
        {
            var slugs = collection.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
            query = query.Where(p => p.ProductCollections.Any(pc => slugs.Contains(pc.Collection.Slug)));
        }

        query = sort switch
        {
            "title_asc" => query.OrderBy(p => p.Title).ThenBy(p => p.Slug),
            "title_desc" => query.OrderByDescending(p => p.Title).ThenBy(p => p.Slug),
            "price_asc" => query.OrderBy(p => p.PriceCents).ThenBy(p => p.Slug),
            "price_desc" => query.OrderByDescending(p => p.PriceCents).ThenBy(p => p.Slug),
            "updated_asc" => query.OrderBy(p => p.UpdatedAt).ThenBy(p => p.Slug),
            _ => query.OrderByDescending(p => p.UpdatedAt).ThenBy(p => p.Slug),
        };

        // Materialize before client-side filters (q, tag, status) that cannot
        // be translated by the EF in-memory provider when acting on JSON columns.
        var materialized = await query.ToListAsync(ct);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.ToLowerInvariant();
            materialized = materialized.Where(p =>
                p.Title.Contains(needle, StringComparison.OrdinalIgnoreCase) ||
                p.Slug.Contains(needle, StringComparison.OrdinalIgnoreCase) ||
                p.Tags.Any(t => t.Contains(needle, StringComparison.OrdinalIgnoreCase))).ToList();
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var tags = tag.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(t => t.ToLowerInvariant()).ToHashSet();
            materialized = materialized.Where(p =>
                p.Tags.Any(t => tags.Contains(t.ToLowerInvariant()))).ToList();
        }

        List<Product> pageItems;
        int totalForResponse;

        if (!string.IsNullOrWhiteSpace(status))
        {
            // Status is derived — filter client-side.
            var statuses = status.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => s.ToLowerInvariant()).ToHashSet();
            var now = DateTime.UtcNow;
            materialized = materialized.Where(p => statuses.Contains(DeriveStatus(p, now))).ToList();
        }

        totalForResponse = materialized.Count;
        pageItems = materialized.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        var now2 = DateTime.UtcNow;
        var items = pageItems.Select(p => new AdminProductListItem(
            p.Slug,
            p.Title,
            p.Excerpt,
            p.PriceCents,
            p.CompareAtPriceCents,
            p.Available,
            p.ProductType.ToString().ToLowerInvariant(),
            DeriveStatus(p, now2),
            p.Tags.ToList(),
            p.ProductCollections.Select(pc => pc.Collection.Slug).ToList(),
            p.Images.FirstOrDefault(),
            p.PublishedAt,
            p.UpdatedAt
        )).ToList();

        return Ok(new AdminProductListResponse(items, totalForResponse, page, pageSize));
    }

    private static string DeriveStatus(Product p, DateTime now)
    {
        if (!p.Available) return "out_of_stock";
        if (p.PublishedAt is null) return "draft";
        if (p.PublishedAt.Value > now) return "scheduled";
        return "published";
    }

    [HttpGet("tags")]
    public async Task<ActionResult<IEnumerable<string>>> Tags(CancellationToken ct)
    {
        var all = await db.Products.AsNoTracking().Select(p => p.Tags).ToListAsync(ct);
        var distinct = all.SelectMany(t => t).Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(t => t, StringComparer.OrdinalIgnoreCase)
            .ToList();
        return Ok(distinct);
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<AdminProductDto>> Get(string slug, CancellationToken ct)
    {
        var p = await db.Products.AsNoTracking()
            .Include(p => p.ProductCollections).ThenInclude(pc => pc.Collection)
            .FirstOrDefaultAsync(p => p.Slug == slug, ct);
        return p is null ? NotFound() : Ok(AdminProductDto.From(p));
    }

    [HttpPost]
    public async Task<ActionResult<AdminProductDto>> Create([FromBody] CreateProductRequest req, CancellationToken ct)
    {
        if (await db.Products.AnyAsync(p => p.Slug == req.Slug, ct))
            return Conflict(new { error = $"Slug '{req.Slug}' already in use" });

        if (!Enum.TryParse<ProductType>(req.ProductType, ignoreCase: true, out var pt))
            return BadRequest(new { error = $"Unknown productType '{req.ProductType}'" });
        if (pt == ProductType.Digital && req.PublishedAt.HasValue)
            return BadRequest(new
            {
                error = "Create digital products as drafts, upload the PDF, then publish them.",
            });

        var product = new Product
        {
            Slug = req.Slug, Title = req.Title, Excerpt = req.Excerpt,
            Description = req.Description, PriceCents = req.PriceCents,
            CompareAtPriceCents = req.CompareAtPriceCents, Available = req.Available,
            ProductType = pt, Images = req.Images,
            Options = (req.Options is { Count: > 0 })
                ? req.Options
                : new List<ProductOption> { new("Format", new List<string> { "Default Title" }) },
            SourceLinks = req.SourceLinks, ReviewImages = req.ReviewImages,
            InspirationImages = req.InspirationImages, Tags = req.Tags,
            PublishedAt = req.PublishedAt,
        };
        db.Products.Add(product);
        await SyncCollectionsAsync(product, req.CollectionSlugs, ct);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { slug = product.Slug }, AdminProductDto.From(product));
    }

    [HttpPost("import")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ProductCsvImportService.MaxMultipartBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = ProductCsvImportService.MaxMultipartBytes)]
    public async Task<ActionResult<ProductCsvImportResponse>> ImportCsv(
        [FromForm] IFormFile? file,
        [FromQuery] string mode = "create",
        [FromQuery] bool dryRun = true,
        CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "A non-empty CSV file is required." });
        if (file.Length > ProductCsvImportService.MaxFileBytes)
            return BadRequest(new { error = "The CSV file must be 2 MB or smaller." });
        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "The import file must use the .csv extension." });

        await using var stream = file.OpenReadStream();
        var importer = new ProductCsvImportService(db, assetCleanup);
        var result = await importer.ImportAsync(stream, mode, dryRun, ct);
        return result.Valid ? Ok(result) : UnprocessableEntity(result);
    }

    [HttpPut("{slug}")]
    public async Task<ActionResult<AdminProductDto>> Update(string slug, [FromBody] UpdateProductRequest req, CancellationToken ct)
    {
        var product = await db.Products
            .Include(p => p.ProductCollections)
            .FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (product is null) return NotFound();

        if (!Enum.TryParse<ProductType>(req.ProductType, ignoreCase: true, out var pt))
            return BadRequest(new { error = $"Unknown productType '{req.ProductType}'" });
        if (pt == ProductType.Digital &&
            req.PublishedAt.HasValue &&
            string.IsNullOrWhiteSpace(product.PdfPath))
            return BadRequest(new { error = "Upload the digital product PDF before publishing." });

        var previousAssets = ProductAssetPaths(product).ToList();

        product.Title = req.Title;
        product.Excerpt = req.Excerpt;
        product.Description = req.Description;
        product.PriceCents = req.PriceCents;
        product.CompareAtPriceCents = req.CompareAtPriceCents;
        product.Available = req.Available;
        product.ProductType = pt;
        product.Images = req.Images;
        if (req.Options is { Count: > 0 })
        {
            product.Options = req.Options;
        }
        product.SourceLinks = req.SourceLinks;
        product.ReviewImages = req.ReviewImages;
        product.InspirationImages = req.InspirationImages;
        product.Tags = req.Tags;
        product.PublishedAt = req.PublishedAt;
        product.UpdatedAt = DateTime.UtcNow;
        await SyncCollectionsAsync(product, req.CollectionSlugs, ct);
        await db.SaveChangesAsync(ct);
        await assetCleanup.DeleteUnreferencedAsync(previousAssets, ct);
        return Ok(AdminProductDto.From(product));
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug, CancellationToken ct)
    {
        var product = await db.Products
            .Include(p => p.ProductCollections)
            .FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (product is null) return NotFound();
        await DeleteProductsAsync([product], ct);
        return NoContent();
    }

    [HttpPost("{slug}/duplicate")]
    public async Task<ActionResult<AdminProductDto>> Duplicate(string slug, CancellationToken ct)
    {
        var source = await db.Products
            .Include(p => p.ProductCollections)
            .FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (source is null) return NotFound();

        var newSlug = $"{slug}-copy";
        var n = 2;
        while (await db.Products.AnyAsync(p => p.Slug == newSlug, ct))
        {
            newSlug = $"{slug}-copy-{n}";
            n++;
        }

        var copy = new Product
        {
            Slug = newSlug,
            Title = source.Title,
            Excerpt = source.Excerpt,
            Description = source.Description.ToList(),
            PriceCents = source.PriceCents,
            CompareAtPriceCents = source.CompareAtPriceCents,
            Available = source.Available,
            ProductType = source.ProductType,
            Images = source.Images.ToList(),
            Options = source.Options.Select(o => new ProductOption(o.Name, o.Values.ToList())).ToList(),
            SourceLinks = source.SourceLinks?.Select(s => new SourceLink(s.Label, s.Href, s.Image, s.Alt)).ToList(),
            ReviewImages = source.ReviewImages?.ToList(),
            InspirationImages = source.InspirationImages?.ToList(),
            Tags = source.Tags.ToList(),
            PublishedAt = null, // draft
        };
        db.Products.Add(copy);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { slug = copy.Slug }, AdminProductDto.From(copy));
    }

    [HttpPost("{slug}/images")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> UploadImage(
        string slug,
        IFormFile file,
        CancellationToken ct,
        [FromQuery] string intent = "gallery")
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (product is null) return NotFound();

        var attachToGallery = intent.Equals("gallery", StringComparison.OrdinalIgnoreCase);
        if (!attachToGallery && !intent.Equals("asset", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Image intent must be 'gallery' or 'asset'." });

        string url;
        try
        {
            url = await uploads.SaveImageAsync(file, "products", slug, ct);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }

        // Inspiration, review, and source-link editors stage uploads until the
        // enclosing product form is saved. The default remains gallery for
        // backwards compatibility with existing API clients.
        if (!attachToGallery)
            return Ok(new UploadResponse(url));

        var previousImages = product.Images;
        try
        {
            product.Images = product.Images.Append(url).ToList();
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            product.Images = previousImages;
            db.Entry(product).State = EntityState.Unchanged;
            // The random URL was never committed or returned, so no CMS row can
            // legitimately reference it. Delete it directly and preserve the
            // original persistence exception.
            uploads.DeleteIfLocal(url);
            throw;
        }
        return Ok(new UploadResponse(url));
    }

    [HttpDelete("assets")]
    public async Task<IActionResult> DeleteStagedAsset([FromQuery] string? url, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(url) ||
            !url.StartsWith("/uploads/products/", StringComparison.Ordinal))
            return BadRequest(new { error = "A staged product upload URL is required." });

        // This is reference-aware, so a late discard cannot delete an asset that
        // another successful CMS save has already adopted.
        await assetCleanup.DeleteUnreferencedAsync([url], ct);
        return NoContent();
    }

    [HttpPost("{slug}/pdf")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<ActionResult<AdminProductDto>> UploadPdf(
        string slug,
        [FromForm] IFormFile? file,
        CancellationToken ct)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (product is null) return NotFound();

        if (file is null)
            return BadRequest(new { error = "A non-empty PDF file is required" });

        CustomerDownloadUpload upload;
        try
        {
            upload = await uploads.SaveCustomerDownloadAsync(
                file,
                "pdfs",
                slug,
                50L * 1024 * 1024,
                allowZip: false,
                ct);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var previousPdf = product.PdfPath;
        product.PdfPath = upload.Url;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            product.PdfPath = previousPdf;
            db.Entry(product).State = EntityState.Unchanged;
            uploads.DeleteIfLocal(upload.Url);
            throw;
        }
        await assetCleanup.DeleteUnreferencedAsync([previousPdf], ct);
        return Ok(AdminProductDto.From(product));
    }

    [HttpPost("bulk")]
    public async Task<ActionResult<AdminProductBulkResponse>> Bulk([FromBody] AdminProductBulkRequest req, CancellationToken ct)
    {
        if (req.Slugs is null || req.Slugs.Count == 0)
            return BadRequest(new { error = "slugs required" });
        if (req.Slugs.Count > MaxBulkProducts)
            return BadRequest(new { error = $"A bulk action can target at most {MaxBulkProducts} products." });

        var requestedSlugs = req.Slugs
            .Select(slug => slug?.Trim() ?? "")
            .Where(slug => slug.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (requestedSlugs.Count == 0)
            return BadRequest(new { error = "slugs required" });

        var products = await db.Products
            .Include(p => p.ProductCollections)
            .Where(p => requestedSlugs.Contains(p.Slug))
            .ToListAsync(ct);
        var foundSlugs = products.Select(product => product.Slug).ToHashSet(StringComparer.Ordinal);
        var missing = requestedSlugs.Where(slug => !foundSlugs.Contains(slug)).ToList();
        if (products.Count == 0)
            return Ok(new AdminProductBulkResponse(0, missing));

        var now = DateTime.UtcNow;
        switch (req.Action)
        {
            case "publish":
                var incompleteDigitalSlugs = products
                    .Where(product => product.ProductType == ProductType.Digital &&
                                      string.IsNullOrWhiteSpace(product.PdfPath))
                    .Select(product => product.Slug)
                    .OrderBy(slug => slug, StringComparer.Ordinal)
                    .ToList();
                if (incompleteDigitalSlugs.Count > 0)
                {
                    return BadRequest(new
                    {
                        error = "Upload a PDF before publishing digital products.",
                        slugs = incompleteDigitalSlugs,
                    });
                }
                foreach (var p in products) { p.PublishedAt = p.PublishedAt ?? now; p.UpdatedAt = now; }
                break;
            case "unpublish":
                foreach (var p in products) { p.PublishedAt = null; p.UpdatedAt = now; }
                break;
            case "mark-available":
                foreach (var p in products) { p.Available = true; p.UpdatedAt = now; }
                break;
            case "mark-unavailable":
                foreach (var p in products) { p.Available = false; p.UpdatedAt = now; }
                break;
            case "delete":
                await DeleteProductsAsync(products, ct);
                return Ok(new AdminProductBulkResponse(products.Count, missing));
            case "add-to-collection":
            case "remove-from-collection":
            {
                var slug = req.Payload?.CollectionSlug;
                if (string.IsNullOrWhiteSpace(slug))
                    return BadRequest(new { error = "payload.collectionSlug required" });
                var collection = await db.Collections.FirstOrDefaultAsync(c => c.Slug == slug, ct);
                if (collection is null) return NotFound(new { error = $"collection '{slug}' not found" });

                foreach (var p in products)
                {
                    var exists = p.ProductCollections.Any(pc => pc.CollectionId == collection.Id);
                    if (req.Action == "add-to-collection" && !exists)
                        db.ProductCollections.Add(new ProductCollection { ProductId = p.Id, CollectionId = collection.Id });
                    if (req.Action == "remove-from-collection" && exists)
                        db.ProductCollections.RemoveRange(p.ProductCollections.Where(pc => pc.CollectionId == collection.Id));
                    p.UpdatedAt = now;
                }
                break;
            }
            default:
                return BadRequest(new { error = $"unknown action '{req.Action}'" });
        }

        await db.SaveChangesAsync(ct);
        return Ok(new AdminProductBulkResponse(products.Count, missing));
    }

    private async Task DeleteProductsAsync(List<Product> products, CancellationToken ct)
    {
        var productIds = products.Select(p => p.Id).ToHashSet();
        var slugs = products.Select(p => p.Slug).ToHashSet(StringComparer.Ordinal);

        // Keep immutable order snapshots while severing the optional live-product link.
        // PostgreSQL also applies ON DELETE SET NULL; this explicit update keeps the
        // behavior consistent when tests use EF's in-memory provider.
        var orderItems = await db.OrderItems
            .Where(i => i.ProductId.HasValue && productIds.Contains(i.ProductId.Value))
            .ToListAsync(ct);
        foreach (var item in orderItems) item.ProductId = null;

        // These records point at slug snapshots instead of product foreign keys.
        // Removing them prevents stale state from returning if a slug is reused.
        var wishlists = await db.Wishlists
            .Where(w => slugs.Contains(w.ProductSlug))
            .ToListAsync(ct);
        var notifyRequests = await db.NotifyMeRequests
            .Where(n => slugs.Contains(n.ProductSlug))
            .ToListAsync(ct);
        db.Wishlists.RemoveRange(wishlists);
        db.NotifyMeRequests.RemoveRange(notifyRequests);

        // ProductOrder is a JSON ordering hint, so it needs explicit cleanup.
        var collections = await db.Collections.ToListAsync(ct);
        foreach (var collection in collections.Where(c => c.ProductOrder.Any(slugs.Contains)))
            collection.ProductOrder = collection.ProductOrder.Where(s => !slugs.Contains(s)).ToList();

        db.ProductCollections.RemoveRange(products.SelectMany(p => p.ProductCollections));
        db.Products.RemoveRange(products);
        await db.SaveChangesAsync(ct);

        await assetCleanup.DeleteUnreferencedAsync(products.SelectMany(ProductAssetPaths), ct);
    }

    private static IEnumerable<string?> ProductAssetPaths(Product product) =>
        product.Images.Cast<string?>()
            .Concat(product.ReviewImages ?? [])
            .Concat(product.InspirationImages ?? [])
            .Concat((product.SourceLinks ?? []).Select(source => source.Image))
            .Concat((product.SourceLinks ?? []).Select(source => (string?)source.Href))
            .Append(product.PdfPath);

    private async Task SyncCollectionsAsync(Product product, List<string> collectionSlugs, CancellationToken ct)
    {
        var collections = await db.Collections.Where(c => collectionSlugs.Contains(c.Slug)).ToListAsync(ct);
        var desiredIds = collections.Select(collection => collection.Id).ToHashSet();
        var existing = product.ProductCollections.ToList();

        foreach (var membership in existing.Where(row => !desiredIds.Contains(row.CollectionId)))
        {
            product.ProductCollections.Remove(membership);
            db.ProductCollections.Remove(membership);
        }

        var existingIds = existing.Select(row => row.CollectionId).ToHashSet();
        foreach (var collection in collections.Where(collection => !existingIds.Contains(collection.Id)))
        {
            db.ProductCollections.Add(new ProductCollection
            {
                ProductId = product.Id,
                Product = product,
                CollectionId = collection.Id,
                Collection = collection,
            });
        }
    }
}
