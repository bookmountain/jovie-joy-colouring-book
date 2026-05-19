using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/comics")]
public class ComicsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ComicWorldDto>>> List(CancellationToken ct)
    {
        var worlds = await db.ComicWorlds.AsNoTracking()
            .Include(w => w.Comics)
            .OrderBy(w => w.SortIndex)
            .ToListAsync(ct);
        return Ok(worlds.Select(ComicWorldDto.From));
    }
}
