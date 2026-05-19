using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/gallery")]
public class GalleryController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<GalleryImageDto>>> List(CancellationToken ct)
    {
        var images = await db.GalleryImages.AsNoTracking().OrderBy(g => g.SortIndex).ToListAsync(ct);
        return Ok(images.Select(GalleryImageDto.From));
    }
}
