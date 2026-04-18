using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
public class AdminContentController(AppDbContext db, IWebHostEnvironment env) : ControllerBase
{
    // Public: frontend reads site content at build/render time
    [HttpGet("api/content")]
    public async Task<ActionResult<IEnumerable<SiteContentDto>>> GetAll(CancellationToken ct)
    {
        var items = await db.SiteContents.AsNoTracking().ToListAsync(ct);
        return Ok(items.Select(SiteContentDto.From));
    }

    [HttpGet("api/content/{key}")]
    public async Task<ActionResult<SiteContentDto>> Get(string key, CancellationToken ct)
    {
        var item = await db.SiteContents.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Key == key, ct);
        return item is null ? NotFound() : Ok(SiteContentDto.From(item));
    }

    // Admin-only write endpoints
    [HttpPut("api/admin/content/{key}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<SiteContentDto>> Upsert(
        string key, [FromBody] UpsertContentRequest req, CancellationToken ct)
    {
        var item = await db.SiteContents.FirstOrDefaultAsync(c => c.Key == key, ct);
        if (item is null)
        {
            item = new SiteContent { Key = key, Value = req.Value, UpdatedAt = DateTime.UtcNow };
            db.SiteContents.Add(item);
        }
        else
        {
            item.Value = req.Value;
            item.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
        return Ok(SiteContentDto.From(item));
    }

    [HttpPost("api/admin/content/{key}/image")]
    [Authorize(Policy = "AdminOnly")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
    public async Task<ActionResult<SiteContentDto>> UploadImage(
        string key, IFormFile file, CancellationToken ct)
    {
        var allowed = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowed.Contains(file.ContentType))
            return BadRequest(new { message = "Only JPEG, PNG, WebP, or GIF images are accepted" });

        var dir = Path.Combine(env.ContentRootPath, "uploads", "images");
        Directory.CreateDirectory(dir);

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{key.Replace('.', '-')}_{Path.GetRandomFileName()}{ext}";
        var filePath = Path.Combine(dir, fileName);

        await using (var stream = System.IO.File.Create(filePath))
            await file.CopyToAsync(stream, ct);

        var imageUrl = $"/uploads/images/{fileName}";

        var item = await db.SiteContents.FirstOrDefaultAsync(c => c.Key == key, ct);
        if (item is null)
        {
            item = new SiteContent { Key = key, Value = imageUrl, Type = "image", UpdatedAt = DateTime.UtcNow };
            db.SiteContents.Add(item);
        }
        else
        {
            // Delete old image file if it was a local upload
            if (!string.IsNullOrEmpty(item.Value) && item.Value.StartsWith("/uploads/images/"))
            {
                var oldFile = Path.Combine(env.ContentRootPath, "uploads", "images",
                    Path.GetFileName(item.Value));
                if (System.IO.File.Exists(oldFile)) System.IO.File.Delete(oldFile);
            }
            item.Value = imageUrl;
            item.Type = "image";
            item.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return Ok(SiteContentDto.From(item));
    }
}
