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
    public async Task<ActionResult<IEnumerable<ProductDto>>> List(CancellationToken ct)
    {
        var products = await db.Products.AsNoTracking()
            .Include(p => p.ProductCollections).ThenInclude(pc => pc.Collection)
            .OrderBy(p => p.Title)
            .ToListAsync(ct);
        return Ok(products.Select(p => ProductDto.From(p)));
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
            PublishedAt = req.PublishedAt ?? DateTime.UtcNow,
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
