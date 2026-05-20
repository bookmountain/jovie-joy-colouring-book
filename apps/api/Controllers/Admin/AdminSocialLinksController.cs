using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/social-links")]
[Authorize(Policy = "AdminOnly")]
public class AdminSocialLinksController(AppDbContext db) : ControllerBase
{
    public record SocialLinkDto(string Label, string Href, int SortIndex);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SocialLinkDto>>> List(CancellationToken ct)
    {
        var rows = await db.SocialLinks.AsNoTracking().OrderBy(s => s.SortIndex).ToListAsync(ct);
        return Ok(rows.Select(s => new SocialLinkDto(s.Label, s.Href, s.SortIndex)));
    }

    [HttpPost]
    public async Task<ActionResult<SocialLinkDto>> Create([FromBody] CreateSocialLinkRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Label) || string.IsNullOrWhiteSpace(req.Href))
            return BadRequest(new { error = "Label and Href are required" });
        if (await db.SocialLinks.AnyAsync(s => s.Label == req.Label, ct))
            return Conflict(new { error = $"Label '{req.Label}' already in use" });
        var row = new SocialLink { Label = req.Label, Href = req.Href, SortIndex = req.SortIndex };
        db.SocialLinks.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(new SocialLinkDto(row.Label, row.Href, row.SortIndex));
    }

    [HttpPut("{label}")]
    public async Task<ActionResult<SocialLinkDto>> Update(string label, [FromBody] UpdateSocialLinkRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Href))
            return BadRequest(new { error = "Href is required" });
        var row = await db.SocialLinks.FirstOrDefaultAsync(s => s.Label == label, ct);
        if (row is null) return NotFound();
        row.Href = req.Href; row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(new SocialLinkDto(row.Label, row.Href, row.SortIndex));
    }

    [HttpDelete("{label}")]
    public async Task<IActionResult> Delete(string label, CancellationToken ct)
    {
        var row = await db.SocialLinks.FirstOrDefaultAsync(s => s.Label == label, ct);
        if (row is null) return NotFound();
        db.SocialLinks.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
