using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/static-pages")]
[Authorize(Policy = "AdminOnly")]
public class AdminStaticPagesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<StaticPageDto>>> List(CancellationToken ct)
    {
        var pages = await db.StaticPages.AsNoTracking().OrderBy(p => p.Slug).ToListAsync(ct);
        return Ok(pages.Select(StaticPageDto.From));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<StaticPageDto>> Get(string slug, CancellationToken ct)
    {
        var p = await db.StaticPages.AsNoTracking().FirstOrDefaultAsync(p => p.Slug == slug, ct);
        return p is null ? NotFound() : Ok(StaticPageDto.From(p));
    }

    [HttpPost]
    public async Task<ActionResult<StaticPageDto>> Create([FromBody] CreateStaticPageRequest req, CancellationToken ct)
    {
        if (await db.StaticPages.AnyAsync(p => p.Slug == req.Slug, ct))
            return Conflict(new { error = $"Slug '{req.Slug}' already in use" });

        var page = new StaticPage { Slug = req.Slug, Title = req.Title, Intro = req.Intro, Blocks = req.Blocks };
        db.StaticPages.Add(page);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { slug = page.Slug }, StaticPageDto.From(page));
    }

    [HttpPut("{slug}")]
    public async Task<ActionResult<StaticPageDto>> Update(string slug, [FromBody] UpdateStaticPageRequest req, CancellationToken ct)
    {
        var p = await db.StaticPages.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (p is null) return NotFound();
        p.Title = req.Title;
        p.Intro = req.Intro;
        p.Blocks = req.Blocks;
        await db.SaveChangesAsync(ct);
        return Ok(StaticPageDto.From(p));
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug, CancellationToken ct)
    {
        var p = await db.StaticPages.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (p is null) return NotFound();
        db.StaticPages.Remove(p);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
