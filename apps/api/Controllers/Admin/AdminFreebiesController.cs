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
    IAssetCleanupService assetCleanup,
    IEmailSender emailSender,
    IOptions<FreebiesOptions> opts,
    ILogger<AdminFreebiesController> logger) : ControllerBase
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
        if (req.Published == true)
            return BadRequest(new { error = "Create the freebie as a draft, upload its file, then publish it." });
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
        if (req.Published && string.IsNullOrWhiteSpace(row.FilePath))
            return BadRequest(new { error = "Upload a PDF or ZIP file before publishing this freebie." });
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
        var previousAssets = new[] { row.CoverImage, row.FilePath };
        // Eager-load + remove children so behaviour is identical under both the
        // relational FK cascade (production) and the InMemory provider (tests).
        if (row.Requests.Count > 0) db.FreebieRequests.RemoveRange(row.Requests);
        db.Freebies.Remove(row);
        await db.SaveChangesAsync(ct);
        await assetCleanup.DeleteUnreferencedAsync(previousAssets, ct);
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
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<FreebieAdminDto>> UploadCover(
        string slug,
        [FromForm] IFormFile? file,
        CancellationToken ct)
    {
        var row = await db.Freebies.FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        if (file is null)
            return BadRequest(new { error = "A non-empty cover image is required" });
        if (!UploadService.ImageFileNameMatchesContentType(file))
            return BadRequest(new { error = "The cover image extension and content type must match" });

        var previousCover = row.CoverImage;
        var previousUpdatedAt = row.UpdatedAt;
        string url;
        try
        {
            url = await uploads.SaveImageAsync(file, "freebies/covers", slug, ct);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }

        row.CoverImage = url;
        row.UpdatedAt = DateTime.UtcNow;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            row.CoverImage = previousCover;
            row.UpdatedAt = previousUpdatedAt;
            db.Entry(row).State = EntityState.Unchanged;
            uploads.DeleteIfLocal(url);
            throw;
        }
        await assetCleanup.DeleteUnreferencedAsync([previousCover], ct);
        var count = await db.FreebieRequests.CountAsync(r => r.FreebieId == row.Id, ct);
        return Ok(FreebieAdminDto.From(row, count, null));
    }

    [HttpPost("{slug}/file")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<ActionResult<FreebieAdminDto>> UploadFile(
        string slug,
        [FromForm] IFormFile? file,
        CancellationToken ct)
    {
        var row = await db.Freebies.FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        if (file is null)
            return BadRequest(new { error = "A non-empty PDF or ZIP file is required" });

        CustomerDownloadUpload upload;
        try
        {
            upload = await uploads.SaveCustomerDownloadAsync(
                file,
                "freebies/files",
                slug,
                opts.Value.MaxFileSizeMb * 1024L * 1024L,
                allowZip: true,
                ct);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var previousFilePath = row.FilePath;
        var previousFileKind = row.FileKind;
        var previousFileSizeBytes = row.FileSizeBytes;
        var previousUpdatedAt = row.UpdatedAt;
        row.FilePath = upload.Url;
        row.FileKind = upload.Kind;
        row.FileSizeBytes = upload.SizeBytes;
        row.UpdatedAt = DateTime.UtcNow;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            row.FilePath = previousFilePath;
            row.FileKind = previousFileKind;
            row.FileSizeBytes = previousFileSizeBytes;
            row.UpdatedAt = previousUpdatedAt;
            db.Entry(row).State = EntityState.Unchanged;
            uploads.DeleteIfLocal(upload.Url);
            throw;
        }
        await assetCleanup.DeleteUnreferencedAsync([previousFilePath], ct);

        var count = await db.FreebieRequests.CountAsync(r => r.FreebieId == row.Id, ct);
        return Ok(FreebieAdminDto.From(row, count, null));
    }

    [HttpGet("{slug}/file")]
    public async Task<IActionResult> DownloadFile(
        string slug,
        [FromServices] IWebHostEnvironment env,
        CancellationToken ct)
    {
        var row = await db.Freebies.AsNoTracking().FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        if (string.IsNullOrWhiteSpace(row.FilePath) ||
            !row.FilePath.StartsWith("/uploads/freebies/files/", StringComparison.Ordinal) ||
            row.FilePath.Contains('\\'))
            return NotFound(new { error = "download_unavailable" });

        var uploadsRoot = Path.GetFullPath(Path.Combine(env.ContentRootPath, "uploads"));
        var relative = row.FilePath["/uploads/".Length..].Replace('/', Path.DirectorySeparatorChar);
        var absolute = Path.GetFullPath(Path.Combine(uploadsRoot, relative));
        var prefix = uploadsRoot + Path.DirectorySeparatorChar;
        if (!absolute.StartsWith(
                prefix,
                OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal) ||
            !System.IO.File.Exists(absolute))
            return NotFound(new { error = "download_unavailable" });

        var kind = row.FileKind == "zip" ? "zip" : "pdf";
        var contentType = kind == "zip" ? "application/zip" : "application/pdf";
        var downloadName = $"{row.Slug}.{kind}";
        return File(
            new FileStream(absolute, FileMode.Open, FileAccess.Read, FileShare.Read),
            contentType,
            downloadName);
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

        var stagedToken = FreebieTokens.Generate();
        var stagedExpiry = DateTime.UtcNow.AddDays(opts.Value.DownloadTtlDays);
        var url = $"{opts.Value.BaseUrl.TrimEnd('/')}/api/freebies/download/{stagedToken}";
        try
        {
            await emailSender.SendFreebieDownloadAsync(row.Email, row.Freebie, url, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Freebie resend failed for {Slug} → {Email}", slug, row.Email);
            return StatusCode(StatusCodes.Status502BadGateway, new { error = "email_send_failed" });
        }
        row.Token = stagedToken;
        row.ExpiresAt = stagedExpiry;
        await db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
