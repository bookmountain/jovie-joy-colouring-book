using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/freebies")]
public class FreebiesController(
    AppDbContext db,
    IEmailSender email,
    IOptions<FreebiesOptions> opts) : ControllerBase
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
            row = new FreebieRequest
            {
                FreebieId = f.Id,
                Email = body.Email,
                Token = FreebieTokens.Generate(),
                ExpiresAt = DateTime.UtcNow + ttl,
                OptedIntoNewsletter = body.OptIn,
                Ip = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
            };
            db.FreebieRequests.Add(row);
        }

        if (body.OptIn && !await db.NewsletterSubscribers.AnyAsync(s => s.Email == body.Email, ct))
            db.NewsletterSubscribers.Add(new NewsletterSubscriber { Email = body.Email });

        await db.SaveChangesAsync(ct);

        var url = $"{opts.Value.BaseUrl.TrimEnd('/')}/api/freebies/download/{row.Token}";
        await email.SendFreebieDownloadAsync(body.Email, f, url, ct);

        return Ok(new { ok = true });
    }
}
