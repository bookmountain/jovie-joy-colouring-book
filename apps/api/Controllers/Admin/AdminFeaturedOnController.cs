using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/featured-on")]
[Authorize(Policy = "AdminOnly")]
public class AdminFeaturedOnController(AppDbContext db, IUploadService uploads) : ControllerBase
{
    private static FeaturedOnDto ToDto(FeaturedOnLink f) =>
        new(f.Slug, f.Label, f.Href, f.Image, f.Alt, f.SortIndex);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FeaturedOnDto>>> List(CancellationToken ct)
    {
        var rows = await db.FeaturedOnLinks.AsNoTracking().OrderBy(f => f.SortIndex).ToListAsync(ct);
        return Ok(rows.Select(ToDto));
    }

    [HttpPost]
    public async Task<ActionResult<FeaturedOnDto>> Create([FromBody] CreateFeaturedOnRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Slug) || string.IsNullOrWhiteSpace(req.Label))
            return BadRequest(new { error = "Slug and Label are required" });
        if (await db.FeaturedOnLinks.AnyAsync(f => f.Slug == req.Slug, ct))
            return Conflict(new { error = $"Slug '{req.Slug}' already in use" });

        var row = new FeaturedOnLink
        {
            Slug = req.Slug, Label = req.Label, Href = req.Href ?? "",
            Image = req.Image ?? "", Alt = req.Alt ?? "", SortIndex = req.SortIndex,
        };
        db.FeaturedOnLinks.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(ToDto(row));
    }

    [HttpPut("{slug}")]
    public async Task<ActionResult<FeaturedOnDto>> Update(string slug, [FromBody] UpdateFeaturedOnRequest req, CancellationToken ct)
    {
        var row = await db.FeaturedOnLinks.FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();

        row.Label = req.Label;
        row.Href = req.Href ?? "";
        row.Image = req.Image ?? "";
        row.Alt = req.Alt ?? "";
        row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(ToDto(row));
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug, CancellationToken ct)
    {
        var row = await db.FeaturedOnLinks.FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        db.FeaturedOnLinks.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{slug}/image")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> UploadImage(string slug, IFormFile file, CancellationToken ct)
    {
        try
        {
            var url = await uploads.SaveImageAsync(file, "featured-on", slug, ct);
            return Ok(new UploadResponse(url));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
