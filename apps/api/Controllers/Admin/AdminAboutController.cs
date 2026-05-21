using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/about")]
[Authorize(Policy = "AdminOnly")]
public class AdminAboutController(AppDbContext db, IUploadService uploads) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AboutSectionDto>>> List(CancellationToken ct)
    {
        var rows = await db.AboutSections.AsNoTracking().OrderBy(s => s.SortIndex).ToListAsync(ct);
        return Ok(rows.Select(AboutSectionDto.From));
    }

    [HttpPost]
    public async Task<ActionResult<AboutSectionDto>> Create([FromBody] CreateAboutSectionRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { error = "Title is required" });
        var row = new AboutSection
        {
            Title = req.Title,
            Body = req.Body ?? new List<string>(),
            Image = req.Image ?? "",
            Alt = req.Alt ?? "",
            Background = req.Background ?? "",
            SortIndex = req.SortIndex,
        };
        db.AboutSections.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(AboutSectionDto.From(row));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AboutSectionDto>> Update(Guid id, [FromBody] UpdateAboutSectionRequest req, CancellationToken ct)
    {
        var row = await db.AboutSections.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (row is null) return NotFound();
        row.Title = req.Title;
        row.Body = req.Body ?? new List<string>();
        row.Image = req.Image ?? "";
        row.Alt = req.Alt ?? "";
        row.Background = req.Background ?? "";
        row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(AboutSectionDto.From(row));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var row = await db.AboutSections.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (row is null) return NotFound();
        db.AboutSections.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/image")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> UploadImage(Guid id, IFormFile file, CancellationToken ct)
    {
        if (!await db.AboutSections.AnyAsync(s => s.Id == id, ct)) return NotFound();
        try
        {
            var url = await uploads.SaveImageAsync(file, "about", id.ToString(), ct);
            return Ok(new UploadResponse(url));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
