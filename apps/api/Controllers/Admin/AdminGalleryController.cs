using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/gallery")]
[Authorize(Policy = "AdminOnly")]
public class AdminGalleryController(AppDbContext db, IUploadService uploads) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<GalleryImageDto>>> List(CancellationToken ct)
    {
        var rows = await db.GalleryImages.AsNoTracking().OrderBy(g => g.SortIndex).ToListAsync(ct);
        return Ok(rows.Select(GalleryImageDto.From));
    }

    [HttpPost]
    public async Task<ActionResult<GalleryImageDto>> Create([FromBody] CreateGalleryImageRequest req, CancellationToken ct)
    {
        var row = new GalleryImage
        {
            Src = req.Src ?? "",
            Alt = req.Alt ?? "",
            SortIndex = req.SortIndex,
        };
        db.GalleryImages.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(GalleryImageDto.From(row));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<GalleryImageDto>> Update(Guid id, [FromBody] UpdateGalleryImageRequest req, CancellationToken ct)
    {
        var row = await db.GalleryImages.FirstOrDefaultAsync(g => g.Id == id, ct);
        if (row is null) return NotFound();

        row.Src = req.Src ?? "";
        row.Alt = req.Alt ?? "";
        row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(GalleryImageDto.From(row));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var row = await db.GalleryImages.FirstOrDefaultAsync(g => g.Id == id, ct);
        if (row is null) return NotFound();
        db.GalleryImages.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("upload")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> Upload(IFormFile file, CancellationToken ct)
    {
        try
        {
            var url = await uploads.SaveImageAsync(file, "gallery", "img", ct);
            return Ok(new UploadResponse(url));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
