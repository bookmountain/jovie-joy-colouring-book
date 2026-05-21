using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/faqs")]
[Authorize(Policy = "AdminOnly")]
public class AdminFaqsController(AppDbContext db) : ControllerBase
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
        if (await db.Faqs.AnyAsync(f => f.Slug == req.Slug, ct))
            return Conflict(new { error = $"Slug '{req.Slug}' already in use" });

        var row = new Faq
        {
            Slug = req.Slug, Question = req.Question, Answer = req.Answer ?? "",
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

        row.Question = req.Question;
        row.Answer = req.Answer ?? "";
        row.Group = string.IsNullOrWhiteSpace(req.Group) ? null : req.Group;
        row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(FaqDto.From(row));
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug, CancellationToken ct)
    {
        var row = await db.Faqs.FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        db.Faqs.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
