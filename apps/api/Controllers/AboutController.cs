using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/about")]
public class AboutController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AboutSectionDto>>> List(CancellationToken ct)
    {
        var sections = await db.AboutSections.AsNoTracking().OrderBy(s => s.SortIndex).ToListAsync(ct);
        return Ok(sections.Select(AboutSectionDto.From));
    }
}
