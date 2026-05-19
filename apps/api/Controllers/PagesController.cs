using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/pages")]
public class PagesController(AppDbContext db) : ControllerBase
{
    [HttpGet("{slug}")]
    public async Task<ActionResult<StaticPageDto>> Get(string slug, CancellationToken ct)
    {
        var page = await db.StaticPages.AsNoTracking().FirstOrDefaultAsync(p => p.Slug == slug, ct);
        return page is null ? NotFound() : Ok(StaticPageDto.From(page));
    }
}
