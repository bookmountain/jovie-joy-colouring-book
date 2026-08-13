using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/faqs")]
[Authorize(Policy = "AdminOnly")]
public class AdminFaqsController(
    AppDbContext db,
    IAssetCleanupService assetCleanup) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FaqDto>>> List(CancellationToken ct)
    {
        var rows = await db.Faqs.AsNoTracking().OrderBy(f => f.SortIndex).ToListAsync(ct);
        return Ok(rows.Select(FaqDto.From));
    }

    [HttpPost]
    public async Task<ActionResult<FaqDto>> Create([FromBody] CreateFaqRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Slug) || string.IsNullOrWhiteSpace(req.Question))
            return BadRequest(new { error = "Slug and Question are required" });
        if (!TryNormalizeLinks(req.Links, out var links, out var linkError))
            return BadRequest(new { error = linkError });
        if (await db.Faqs.AnyAsync(f => f.Slug == req.Slug, ct))
            return Conflict(new { error = $"Slug '{req.Slug}' already in use" });

        var row = new Faq
        {
            Slug = req.Slug, Question = req.Question, Answer = req.Answer ?? "",
            Links = links,
            Group = string.IsNullOrWhiteSpace(req.Group) ? null : req.Group,
            SortIndex = req.SortIndex,
        };
        db.Faqs.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(FaqDto.From(row));
    }

    [HttpPut("{slug}")]
    public async Task<ActionResult<FaqDto>> Update(string slug, [FromBody] UpdateFaqRequest req, CancellationToken ct)
    {
        var row = await db.Faqs.FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        if (!TryNormalizeLinks(req.Links, out var links, out var linkError))
            return BadRequest(new { error = linkError });
        var previousHrefs = row.Links?.Select(link => link.Href).ToList() ?? [];

        row.Question = req.Question;
        row.Answer = req.Answer ?? "";
        row.Links = links;
        row.Group = string.IsNullOrWhiteSpace(req.Group) ? null : req.Group;
        row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        await assetCleanup.DeleteUnreferencedAsync(previousHrefs, ct);
        return Ok(FaqDto.From(row));
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug, CancellationToken ct)
    {
        var row = await db.Faqs.FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        var previousHrefs = row.Links?.Select(link => link.Href).ToList() ?? [];
        db.Faqs.Remove(row);
        await db.SaveChangesAsync(ct);
        await assetCleanup.DeleteUnreferencedAsync(previousHrefs, ct);
        return NoContent();
    }

    private static bool TryNormalizeLinks(
        IEnumerable<FaqLinkDto>? links,
        out List<FaqLink>? normalized,
        out string? error)
    {
        normalized = null;
        error = null;
        if (links is null) return true;

        var result = new List<FaqLink>();
        foreach (var link in links)
        {
            var label = link.Label?.Trim() ?? "";
            var href = link.Href?.Trim() ?? "";
            if (label.Length == 0 && href.Length == 0) continue;
            if (label.Length == 0 || href.Length == 0)
            {
                error = "Each FAQ retailer button requires both a label and destination URL.";
                return false;
            }
            if (label.Length > 100 || href.Length > 2048)
            {
                error = "FAQ retailer button labels must be at most 100 characters and URLs at most 2048 characters.";
                return false;
            }
            if (!IsAllowedHref(href))
            {
                error = "FAQ retailer button URLs must use http://, https://, or a site-relative / path.";
                return false;
            }

            result.Add(new FaqLink(label, href));
        }

        normalized = result.Count > 0 ? result : null;
        return true;
    }

    private static bool IsAllowedHref(string href)
    {
        if (href.StartsWith('/') && !href.StartsWith("//"))
            return Uri.TryCreate(href, UriKind.Relative, out _);

        return Uri.TryCreate(href, UriKind.Absolute, out var uri) &&
               (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
