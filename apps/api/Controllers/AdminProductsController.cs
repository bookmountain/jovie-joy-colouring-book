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
public class AdminProductsController(AppDbContext db, IUploadService uploads) : ControllerBase
{
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
            "title_asc" => query.OrderBy(p => p.Title),
            "title_desc" => query.OrderByDescending(p => p.Title),
            "price_asc" => query.OrderBy(p => p.PriceCents),
            "price_desc" => query.OrderByDescending(p => p.PriceCents),
            "updated_asc" => query.OrderBy(p => p.UpdatedAt),
            _ => query.OrderByDescending(p => p.UpdatedAt),
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
    public async Task<ActionResult<ProductDto>> Get(string slug, CancellationToken ct)
    {
        var p = await db.Products.AsNoTracking()
            .Include(p => p.ProductCollections).ThenInclude(pc => pc.Collection)
            .FirstOrDefaultAsync(p => p.Slug == slug, ct);
        return p is null ? NotFound() : Ok(ProductDto.From(p));
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductRequest req, CancellationToken ct)
    {
        if (await db.Products.AnyAsync(p => p.Slug == req.Slug, ct))
            return Conflict(new { error = $"Slug '{req.Slug}' already in use" });

        if (!Enum.TryParse<ProductType>(req.ProductType, ignoreCase: true, out var pt))
            return BadRequest(new { error = $"Unknown productType '{req.ProductType}'" });

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
        await db.SaveChangesAsync(ct);

        await SyncCollectionsAsync(product, req.CollectionSlugs, ct);
        return CreatedAtAction(nameof(Get), new { slug = product.Slug }, ProductDto.From(product));
    }

    [HttpPut("{slug}")]
    public async Task<ActionResult<ProductDto>> Update(string slug, [FromBody] UpdateProductRequest req, CancellationToken ct)
    {
        var product = await db.Products
            .Include(p => p.ProductCollections)
            .FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (product is null) return NotFound();

        if (!Enum.TryParse<ProductType>(req.ProductType, ignoreCase: true, out var pt))
            return BadRequest(new { error = $"Unknown productType '{req.ProductType}'" });

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
        product.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        await SyncCollectionsAsync(product, req.CollectionSlugs, ct);
        return Ok(ProductDto.From(product));
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug, CancellationToken ct)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (product is null) return NotFound();
        product.Available = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{slug}/duplicate")]
    public async Task<ActionResult<ProductDto>> Duplicate(string slug, CancellationToken ct)
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

        return CreatedAtAction(nameof(Get), new { slug = copy.Slug }, ProductDto.From(copy));
    }

    [HttpPost("{slug}/images")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> UploadImage(string slug, IFormFile file, CancellationToken ct)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (product is null) return NotFound();
        try
        {
            var url = await uploads.SaveImageAsync(file, "products", slug, ct);
            product.Images = product.Images.Append(url).ToList();
            await db.SaveChangesAsync(ct);
            return Ok(new UploadResponse(url));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{slug}/pdf")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<ActionResult<ProductDto>> UploadPdf(string slug, IFormFile file, CancellationToken ct)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (product is null) return NotFound();

        if (file.ContentType != "application/pdf" && !file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Only PDF files are accepted" });

        var dir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "pdfs");
        Directory.CreateDirectory(dir);
        var fileName = $"{slug}_{Path.GetRandomFileName()}.pdf";
        var filePath = Path.Combine(dir, fileName);
        await using (var stream = System.IO.File.Create(filePath))
            await file.CopyToAsync(stream, ct);

        if (!string.IsNullOrEmpty(product.PdfPath))
        {
            var oldPath = Path.Combine(Directory.GetCurrentDirectory(), product.PdfPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
        }

        product.PdfPath = $"/uploads/pdfs/{fileName}";
        await db.SaveChangesAsync(ct);
        return Ok(ProductDto.From(product));
    }

    [HttpPost("bulk")]
    public async Task<ActionResult<object>> Bulk([FromBody] AdminProductBulkRequest req, CancellationToken ct)
    {
        if (req.Slugs is null || req.Slugs.Count == 0)
            return BadRequest(new { error = "slugs required" });

        var products = await db.Products
            .Include(p => p.ProductCollections)
            .Where(p => req.Slugs.Contains(p.Slug))
            .ToListAsync(ct);
        if (products.Count == 0) return Ok(new { updated = 0 });

        var now = DateTime.UtcNow;
        switch (req.Action)
        {
            case "publish":
                foreach (var p in products) { p.PublishedAt = p.PublishedAt ?? now; p.UpdatedAt = now; }
                break;
            case "unpublish":
                foreach (var p in products) { p.PublishedAt = null; p.UpdatedAt = now; }
                break;
            case "delete":
                foreach (var p in products) { p.Available = false; p.UpdatedAt = now; }
                break;
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
        return Ok(new { updated = products.Count });
    }

    private async Task SyncCollectionsAsync(Product product, List<string> collectionSlugs, CancellationToken ct)
    {
        var collections = await db.Collections.Where(c => collectionSlugs.Contains(c.Slug)).ToListAsync(ct);
        var existing = await db.ProductCollections.Where(pc => pc.ProductId == product.Id).ToListAsync(ct);
        db.ProductCollections.RemoveRange(existing);
        foreach (var c in collections)
            db.ProductCollections.Add(new ProductCollection { ProductId = product.Id, CollectionId = c.Id });
        await db.SaveChangesAsync(ct);
    }
}
