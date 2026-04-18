using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/admin/products")]
[Authorize(Policy = "AdminOnly")]
public class AdminProductsController(AppDbContext db, IWebHostEnvironment env) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> List(CancellationToken ct)
    {
        var products = await db.Products
            .AsNoTracking()
            .OrderBy(p => p.Id)
            .ToListAsync(ct);
        return Ok(products.Select(ProductDto.From));
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> Create(
        [FromBody] CreateProductRequest req, CancellationToken ct)
    {
        if (await db.Products.AnyAsync(p => p.Id == req.Id, ct))
            return Conflict(new { message = $"Product '{req.Id}' already exists" });

        var product = new Product
        {
            Id = req.Id,
            Title = req.Title,
            PriceCents = req.PriceCents,
            Pages = req.Pages,
            AgeRange = req.AgeRange,
            Theme = req.Theme,
            Difficulty = req.Difficulty,
            Color = req.Color,
            Accent = req.Accent,
            Badge = req.Badge,
            Description = req.Description,
        };
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(List), ProductDto.From(product));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ProductDto>> Update(
        string id, [FromBody] UpdateProductRequest req, CancellationToken ct)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (product is null) return NotFound();

        product.Title = req.Title;
        product.PriceCents = req.PriceCents;
        product.Pages = req.Pages;
        product.AgeRange = req.AgeRange;
        product.Theme = req.Theme;
        product.Difficulty = req.Difficulty;
        product.Color = req.Color;
        product.Accent = req.Accent;
        product.Badge = req.Badge;
        product.Description = req.Description;
        product.IsActive = req.IsActive;

        await db.SaveChangesAsync(ct);
        return Ok(ProductDto.From(product));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (product is null) return NotFound();
        // Soft-delete: deactivate rather than remove (preserves order history)
        product.IsActive = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id}/pdf")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50 MB
    public async Task<ActionResult<ProductDto>> UploadPdf(
        string id, IFormFile file, CancellationToken ct)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (product is null) return NotFound();

        if (file.ContentType != "application/pdf" && !file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Only PDF files are accepted" });

        var dir = Path.Combine(env.ContentRootPath, "uploads", "pdfs");
        Directory.CreateDirectory(dir);

        var fileName = $"{id}_{Path.GetRandomFileName()}.pdf";
        var filePath = Path.Combine(dir, fileName);

        await using (var stream = System.IO.File.Create(filePath))
            await file.CopyToAsync(stream, ct);

        // Delete old file if present
        if (!string.IsNullOrEmpty(product.PdfStorageKey))
        {
            var oldPath = Path.Combine(env.ContentRootPath, "uploads", "pdfs", product.PdfStorageKey);
            if (System.IO.File.Exists(oldPath))
                System.IO.File.Delete(oldPath);
        }

        product.PdfStorageKey = fileName;
        await db.SaveChangesAsync(ct);
        return Ok(ProductDto.From(product));
    }
}
