using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/freebies")]
[Authorize(Policy = "AdminOnly")]
public class AdminFreebiesController(
    AppDbContext db,
    IUploadService uploads,
    IWebHostEnvironment env,
    IEmailSender emailSender,
    IOptions<FreebiesOptions> opts) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FreebieAdminDto>>> List(CancellationToken ct)
    {
        var rows = await db.Freebies.AsNoTracking()
            .OrderBy(f => f.SortIndex).ThenBy(f => f.Title)
            .Select(f => new
            {
                F = f,
                Count = f.Requests.Count(),
                Last = f.Requests.OrderByDescending(r => r.CreatedAt).Select(r => (DateTime?)r.CreatedAt).FirstOrDefault(),
            })
            .ToListAsync(ct);
        return Ok(rows.Select(x => FreebieAdminDto.From(x.F, x.Count, x.Last)));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<FreebieAdminDto>> Get(string slug, CancellationToken ct)
    {
        var f = await db.Freebies.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug, ct);
        if (f is null) return NotFound();
        var count = await db.FreebieRequests.CountAsync(r => r.FreebieId == f.Id, ct);
        var last = await db.FreebieRequests.Where(r => r.FreebieId == f.Id)
            .OrderByDescending(r => r.CreatedAt).Select(r => (DateTime?)r.CreatedAt).FirstOrDefaultAsync(ct);
        return Ok(FreebieAdminDto.From(f, count, last));
    }

    [HttpPost]
    public async Task<ActionResult<FreebieAdminDto>> Create([FromBody] CreateFreebieRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Slug) || string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { error = "Slug and Title are required" });
        if (await db.Freebies.AnyAsync(x => x.Slug == req.Slug, ct))
            return Conflict(new { error = $"Slug '{req.Slug}' already in use" });

        var maxOrder = await db.Freebies.MaxAsync(f => (int?)f.SortIndex, ct) ?? -1;
        var row = new Freebie
        {
            Slug = req.Slug,
            Title = req.Title,
            Excerpt = req.Excerpt ?? "",
            Description = req.Description ?? new List<string>(),
            Published = req.Published ?? false,
            SortIndex = maxOrder + 1,
        };
        db.Freebies.Add(row);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { slug = row.Slug }, FreebieAdminDto.From(row, 0, null));
    }

    [HttpPut("{slug}")]
    public async Task<ActionResult<FreebieAdminDto>> Update(string slug, [FromBody] UpdateFreebieRequest req, CancellationToken ct)
    {
        var row = await db.Freebies.FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        row.Title = string.IsNullOrWhiteSpace(req.Title) ? row.Title : req.Title;
        row.Excerpt = req.Excerpt ?? "";
        row.Description = req.Description ?? new List<string>();
        row.Published = req.Published;
        row.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(FreebieAdminDto.From(row, 0, null));
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug, CancellationToken ct)
    {
        var row = await db.Freebies.Include(f => f.Requests).FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        // Eager-load + remove children so behaviour is identical under both the
        // relational FK cascade (production) and the InMemory provider (tests).
        if (row.Requests.Count > 0) db.FreebieRequests.RemoveRange(row.Requests);
        db.Freebies.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder([FromBody] List<FreebieReorderItem> items, CancellationToken ct)
    {
        var slugs = items.Select(i => i.Slug).ToList();
        var rows = await db.Freebies.Where(f => slugs.Contains(f.Slug)).ToListAsync(ct);
        foreach (var item in items)
        {
            var row = rows.FirstOrDefault(r => r.Slug == item.Slug);
            if (row is not null) row.SortIndex = item.SortIndex;
        }
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{slug}/cover")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<FreebieAdminDto>> UploadCover(string slug, IFormFile file, CancellationToken ct)
    {
        var row = await db.Freebies.FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        try
        {
            var url = await uploads.SaveImageAsync(file, "freebies/covers", slug, ct);
            uploads.DeleteIfLocal(row.CoverImage);
            row.CoverImage = url;
            row.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            var count = await db.FreebieRequests.CountAsync(r => r.FreebieId == row.Id, ct);
            return Ok(FreebieAdminDto.From(row, count, null));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{slug}/file")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<ActionResult<FreebieAdminDto>> UploadFile(string slug, IFormFile file, CancellationToken ct)
    {
        var row = await db.Freebies.FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var kind = ext switch
        {
            ".pdf" => "pdf",
            ".zip" => "zip",
            _ => null,
        };
        if (kind is null) return BadRequest(new { error = "Only .pdf or .zip accepted" });
        if (file.Length > opts.Value.MaxFileSizeMb * 1024L * 1024L)
            return BadRequest(new { error = $"File exceeds {opts.Value.MaxFileSizeMb}MB" });

        var dir = Path.Combine(env.ContentRootPath, "uploads", "freebies", "files");
        Directory.CreateDirectory(dir);
        var fileName = $"{slug}_{Path.GetRandomFileName()}{ext}";
        var abs = Path.Combine(dir, fileName);
        await using (var stream = System.IO.File.Create(abs))
            await file.CopyToAsync(stream, ct);

        // remove old file if any
        if (!string.IsNullOrEmpty(row.FilePath))
        {
            var oldAbs = Path.Combine(env.ContentRootPath, row.FilePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(oldAbs)) System.IO.File.Delete(oldAbs);
        }

        row.FilePath = $"/uploads/freebies/files/{fileName}";
        row.FileKind = kind;
        row.FileSizeBytes = file.Length;
        row.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var count = await db.FreebieRequests.CountAsync(r => r.FreebieId == row.Id, ct);
        return Ok(FreebieAdminDto.From(row, count, null));
    }

    [HttpGet("{slug}/requests")]
    public async Task<ActionResult<IEnumerable<FreebieRequestDto>>> Requests(string slug, CancellationToken ct)
    {
        var row = await db.Freebies.AsNoTracking().FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        var requests = await db.FreebieRequests.AsNoTracking()
            .Where(r => r.FreebieId == row.Id)
            .OrderByDescending(r => r.CreatedAt)
            .Take(500)
            .Select(r => new FreebieRequestDto(
                r.Id, r.Email, r.OptedIntoNewsletter, r.DownloadCount,
                r.FirstDownloadedAt, r.LastDownloadedAt, r.ExpiresAt, r.CreatedAt))
            .ToListAsync(ct);
        return Ok(requests);
    }

    [HttpPost("{slug}/requests/{id:guid}/resend")]
    public async Task<IActionResult> Resend(string slug, Guid id, CancellationToken ct)
    {
        var row = await db.FreebieRequests.Include(r => r.Freebie)
            .FirstOrDefaultAsync(r => r.Id == id && r.Freebie.Slug == slug, ct);
        if (row is null) return NotFound();

        row.Token = FreebieTokens.Generate();
        row.ExpiresAt = DateTime.UtcNow.AddDays(opts.Value.DownloadTtlDays);
        await db.SaveChangesAsync(ct);

        var url = $"{opts.Value.BaseUrl.TrimEnd('/')}/api/freebies/download/{row.Token}";
        await emailSender.SendFreebieDownloadAsync(row.Email, row.Freebie, url, ct);
        return Ok(new { ok = true });
    }
}
