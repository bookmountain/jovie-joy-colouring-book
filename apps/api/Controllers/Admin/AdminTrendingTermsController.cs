using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/trending-terms")]
[Authorize(Policy = "AdminOnly")]
public class AdminTrendingTermsController(AppDbContext db) : ControllerBase
{
    public record TrendingTermDto(string Term, int SortIndex);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TrendingTermDto>>> List(CancellationToken ct)
    {
        var rows = await db.TrendingTerms.AsNoTracking().OrderBy(t => t.SortIndex).ToListAsync(ct);
        return Ok(rows.Select(t => new TrendingTermDto(t.Term, t.SortIndex)));
    }

    [HttpPost]
    public async Task<ActionResult<TrendingTermDto>> Create([FromBody] CreateTrendingTermRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Term))
            return BadRequest(new { error = "Term is required" });
        if (await db.TrendingTerms.AnyAsync(t => t.Term == req.Term, ct))
            return Conflict(new { error = $"Term '{req.Term}' already exists" });
        var row = new TrendingTerm { Term = req.Term, SortIndex = req.SortIndex };
        db.TrendingTerms.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(new TrendingTermDto(row.Term, row.SortIndex));
    }

    [HttpPut("{term}")]
    public async Task<ActionResult<TrendingTermDto>> Update(string term, [FromBody] UpdateTrendingTermRequest req, CancellationToken ct)
    {
        var row = await db.TrendingTerms.FirstOrDefaultAsync(t => t.Term == term, ct);
        if (row is null) return NotFound();
        row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(new TrendingTermDto(row.Term, row.SortIndex));
    }

    [HttpDelete("{term}")]
    public async Task<IActionResult> Delete(string term, CancellationToken ct)
    {
        var row = await db.TrendingTerms.FirstOrDefaultAsync(t => t.Term == term, ct);
        if (row is null) return NotFound();
        db.TrendingTerms.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
