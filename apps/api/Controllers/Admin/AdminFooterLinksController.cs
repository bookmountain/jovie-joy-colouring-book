using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/footer-links")]
[Authorize(Policy = "AdminOnly")]
public class AdminFooterLinksController(AppDbContext db) : ControllerBase
{
    public record FooterLinkDto(Guid Id, string GroupKey, string GroupTitle, string Label, string Href, int SortIndex);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FooterLinkDto>>> List(CancellationToken ct)
    {
        var rows = await db.FooterLinks.AsNoTracking().OrderBy(f => f.GroupKey).ThenBy(f => f.SortIndex).ToListAsync(ct);
        return Ok(rows.Select(f => new FooterLinkDto(f.Id, f.GroupKey, f.GroupTitle, f.Label, f.Href, f.SortIndex)));
    }

    [HttpPost]
    public async Task<ActionResult<FooterLinkDto>> Create([FromBody] CreateFooterLinkRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.GroupKey) || string.IsNullOrWhiteSpace(req.Label) || string.IsNullOrWhiteSpace(req.Href))
            return BadRequest(new { error = "GroupKey, Label, and Href are required" });

        var row = new FooterLink
        {
            GroupKey = req.GroupKey, GroupTitle = req.GroupTitle,
            Label = req.Label, Href = req.Href, SortIndex = req.SortIndex,
        };
        db.FooterLinks.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(new FooterLinkDto(row.Id, row.GroupKey, row.GroupTitle, row.Label, row.Href, row.SortIndex));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FooterLinkDto>> Update(Guid id, [FromBody] UpdateFooterLinkRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Label) || string.IsNullOrWhiteSpace(req.Href))
            return BadRequest(new { error = "Label and Href are required" });

        var row = await db.FooterLinks.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (row is null) return NotFound();
        row.GroupKey = req.GroupKey; row.GroupTitle = req.GroupTitle;
        row.Label = req.Label; row.Href = req.Href; row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(new FooterLinkDto(row.Id, row.GroupKey, row.GroupTitle, row.Label, row.Href, row.SortIndex));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var row = await db.FooterLinks.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (row is null) return NotFound();
        db.FooterLinks.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
