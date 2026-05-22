using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/freebies")]
[Authorize(Policy = "AdminOnly")]
public class AdminFreebiesController(AppDbContext db) : ControllerBase
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
        row.Title = req.Title;
        row.Excerpt = req.Excerpt;
        row.Description = req.Description;
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
}
