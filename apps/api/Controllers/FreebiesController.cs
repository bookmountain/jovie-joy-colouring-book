using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/freebies")]
public class FreebiesController(
    AppDbContext db,
    IEmailSender email,
    IOptions<FreebiesOptions> opts,
    ILogger<FreebiesController> logger,
    IWebHostEnvironment env) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FreebieListItemDto>>> List(CancellationToken ct)
    {
        var rows = await db.Freebies.AsNoTracking()
            .Where(f => f.Published)
            .OrderBy(f => f.SortIndex).ThenBy(f => f.Title)
            .ToListAsync(ct);
        return Ok(rows.Select(FreebieListItemDto.From));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<FreebieDto>> Get(string slug, CancellationToken ct)
    {
        var f = await db.Freebies.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Slug == slug && x.Published, ct);
        if (f is null) return NotFound();
        return Ok(FreebieDto.From(f));
    }

    [HttpPost("{slug}/request")]
    public async Task<IActionResult> CreateRequest(string slug, [FromBody] FreebieRequestCreate body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Email) || !body.Email.Contains('@') || body.Email.Length > 320)
            return BadRequest(new { error = "Valid email required" });

        var f = await db.Freebies.FirstOrDefaultAsync(x => x.Slug == slug && x.Published, ct);
        if (f is null) return NotFound();

        var ttl = TimeSpan.FromDays(opts.Value.DownloadTtlDays);
        var existing = await db.FreebieRequests
            .FirstOrDefaultAsync(r => r.FreebieId == f.Id && r.Email == body.Email, ct);
        FreebieRequest row;
        if (existing is not null)
        {
            existing.Token = FreebieTokens.Generate();
            existing.ExpiresAt = DateTime.UtcNow + ttl;
            existing.OptedIntoNewsletter = existing.OptedIntoNewsletter || body.OptIn;
            row = existing;
        }
        else
        {
            var rawUa = Request.Headers.UserAgent.ToString();
            var ua = string.IsNullOrEmpty(rawUa) ? null : rawUa[..Math.Min(rawUa.Length, 500)];
            row = new FreebieRequest
            {
                FreebieId = f.Id,
                Email = body.Email,
                Token = FreebieTokens.Generate(),
                ExpiresAt = DateTime.UtcNow + ttl,
                OptedIntoNewsletter = body.OptIn,
                Ip = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = ua,
            };
            db.FreebieRequests.Add(row);
        }

        if (body.OptIn && !await db.NewsletterSubscribers.AnyAsync(s => s.Email == body.Email, ct))
            db.NewsletterSubscribers.Add(new NewsletterSubscriber { Email = body.Email });

        await db.SaveChangesAsync(ct);

        var url = $"{opts.Value.BaseUrl.TrimEnd('/')}/api/freebies/download/{row.Token}";
        try
        {
            await email.SendFreebieDownloadAsync(body.Email, f, url, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Freebie email send failed for {Slug} → {Email}", slug, body.Email);
            return StatusCode(StatusCodes.Status502BadGateway, new { error = "email_send_failed" });
        }

        return Ok(new { ok = true });
    }

    [HttpGet("download/{token}")]
    public async Task<IActionResult> Download(string token, CancellationToken ct)
    {
        var webAppUrl = HttpContext.RequestServices
            .GetRequiredService<IConfiguration>()["WebAppUrl"] ?? "http://localhost:3000";

        var req = await db.FreebieRequests.Include(r => r.Freebie)
            .FirstOrDefaultAsync(r => r.Token == token, ct);
        if (req is null) return Redirect($"{webAppUrl}/pages/freebies?download=invalid");
        if (req.ExpiresAt < DateTime.UtcNow || !req.Freebie.Published)
            return Redirect($"{webAppUrl}/pages/freebies?download=expired");

        var rel = req.Freebie.FilePath.TrimStart('/');
        var abs = Path.Combine(env.ContentRootPath, rel.Replace('/', Path.DirectorySeparatorChar));
        if (!System.IO.File.Exists(abs))
            return Redirect($"{webAppUrl}/pages/freebies?download=expired");

        req.DownloadCount += 1;
        req.FirstDownloadedAt ??= DateTime.UtcNow;
        req.LastDownloadedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var safeSlug = string.Concat(req.Freebie.Slug.Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_'));
        var downloadName = $"{safeSlug}.{req.Freebie.FileKind}";
        var contentType = req.Freebie.FileKind == "zip" ? "application/zip" : "application/pdf";
        var stream = System.IO.File.OpenRead(abs);
        return File(stream, contentType, downloadName);
    }
}
