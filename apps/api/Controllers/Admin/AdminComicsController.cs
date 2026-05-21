using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/comics")]
[Authorize(Policy = "AdminOnly")]
public class AdminComicsController(AppDbContext db, IUploadService uploads) : ControllerBase
{
    // ----- Worlds -----

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ComicWorldDto>>> ListWorlds(CancellationToken ct)
    {
        var rows = await db.ComicWorlds.AsNoTracking()
            .Include(w => w.Comics)
            .OrderBy(w => w.SortIndex)
            .ToListAsync(ct);
        return Ok(rows.Select(ComicWorldDto.From));
    }

    [HttpPost]
    public async Task<ActionResult<ComicWorldDto>> CreateWorld([FromBody] CreateComicWorldRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { error = "Title is required" });
        var row = new ComicWorld { Title = req.Title, SortIndex = req.SortIndex };
        db.ComicWorlds.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(ComicWorldDto.From(row));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ComicWorldDto>> UpdateWorld(Guid id, [FromBody] UpdateComicWorldRequest req, CancellationToken ct)
    {
        var row = await db.ComicWorlds.Include(w => w.Comics).FirstOrDefaultAsync(w => w.Id == id, ct);
        if (row is null) return NotFound();
        row.Title = req.Title; row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(ComicWorldDto.From(row));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteWorld(Guid id, CancellationToken ct)
    {
        var row = await db.ComicWorlds.Include(w => w.Comics).FirstOrDefaultAsync(w => w.Id == id, ct);
        if (row is null) return NotFound();
        db.ComicWorlds.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ----- Comics -----

    [HttpGet("{worldId:guid}/comics")]
    public async Task<ActionResult<IEnumerable<ComicDto>>> ListComics(Guid worldId, CancellationToken ct)
    {
        var rows = await db.Comics.AsNoTracking()
            .Where(c => c.WorldId == worldId)
            .OrderBy(c => c.SortIndex)
            .ToListAsync(ct);
        return Ok(rows.Select(ComicDto.From));
    }

    [HttpPost("{worldId:guid}/comics")]
    public async Task<ActionResult<ComicDto>> CreateComic(Guid worldId, [FromBody] CreateComicRequest req, CancellationToken ct)
    {
        if (!await db.ComicWorlds.AnyAsync(w => w.Id == worldId, ct))
            return NotFound(new { error = "Comic world not found" });
        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { error = "Title is required" });

        var row = new Comic
        {
            WorldId = worldId,
            Title = req.Title,
            Description = req.Description ?? "",
            HasDownload = req.HasDownload,
            Images = req.Images?.Select(i => new ComicImage(i.Src, i.Alt)).ToList() ?? new List<ComicImage>(),
            SortIndex = req.SortIndex,
        };
        db.Comics.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(ComicDto.From(row));
    }

    [HttpPut("{worldId:guid}/comics/{comicId:guid}")]
    public async Task<ActionResult<ComicDto>> UpdateComic(Guid worldId, Guid comicId, [FromBody] UpdateComicRequest req, CancellationToken ct)
    {
        var row = await db.Comics.FirstOrDefaultAsync(c => c.Id == comicId && c.WorldId == worldId, ct);
        if (row is null) return NotFound();
        row.Title = req.Title;
        row.Description = req.Description ?? "";
        row.HasDownload = req.HasDownload;
        row.Images = req.Images?.Select(i => new ComicImage(i.Src, i.Alt)).ToList() ?? new List<ComicImage>();
        row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(ComicDto.From(row));
    }

    [HttpDelete("{worldId:guid}/comics/{comicId:guid}")]
    public async Task<IActionResult> DeleteComic(Guid worldId, Guid comicId, CancellationToken ct)
    {
        var row = await db.Comics.FirstOrDefaultAsync(c => c.Id == comicId && c.WorldId == worldId, ct);
        if (row is null) return NotFound();
        db.Comics.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{worldId:guid}/comics/{comicId:guid}/image")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> UploadComicImage(Guid worldId, Guid comicId, IFormFile file, CancellationToken ct)
    {
        if (!await db.Comics.AnyAsync(c => c.Id == comicId && c.WorldId == worldId, ct))
            return NotFound();
        try
        {
            var url = await uploads.SaveImageAsync(file, $"comics/{worldId}", comicId.ToString(), ct);
            return Ok(new UploadResponse(url));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
