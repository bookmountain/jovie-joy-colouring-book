using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/freebies")]
public class FreebiesController(AppDbContext db) : ControllerBase
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
}
