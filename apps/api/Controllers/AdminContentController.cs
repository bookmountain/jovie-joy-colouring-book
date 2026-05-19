using System.Text.Json;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/admin/content")]
[Authorize(Policy = "AdminOnly")]
public class AdminContentController(AppDbContext db, IUploadService uploads) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ContentBlockDto>>> List(CancellationToken ct)
    {
        var blocks = await db.ContentBlocks.AsNoTracking().OrderBy(b => b.Type).ThenBy(b => b.SortIndex).ToListAsync(ct);
        return Ok(blocks.Select(ContentBlockDto.From));
    }

    [HttpGet("{key}")]
    public async Task<ActionResult<ContentBlockDto>> Get(string key, CancellationToken ct)
    {
        var b = await db.ContentBlocks.AsNoTracking().FirstOrDefaultAsync(b => b.Key == key, ct);
        return b is null ? NotFound() : Ok(ContentBlockDto.From(b));
    }

    [HttpPut("{key}")]
    public async Task<ActionResult<ContentBlockDto>> Upsert(string key, [FromBody] UpsertContentBlockRequest req, CancellationToken ct)
    {
        if (!Enum.TryParse<ContentBlockType>(req.Type, ignoreCase: true, out var type))
            return BadRequest(new { error = $"Unknown content block type '{req.Type}'" });

        var existing = await db.ContentBlocks.FirstOrDefaultAsync(b => b.Key == key, ct);
        var json = JsonDocument.Parse(req.Data.GetRawText());
        if (existing is null)
        {
            db.ContentBlocks.Add(new ContentBlock { Key = key, Type = type, Data = json, SortIndex = req.SortIndex });
        }
        else
        {
            existing.Type = type;
            existing.Data = json;
            existing.SortIndex = req.SortIndex;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);

        var saved = await db.ContentBlocks.AsNoTracking().FirstAsync(b => b.Key == key, ct);
        return Ok(ContentBlockDto.From(saved));
    }

    [HttpDelete("{key}")]
    public async Task<IActionResult> Delete(string key, CancellationToken ct)
    {
        var b = await db.ContentBlocks.FirstOrDefaultAsync(b => b.Key == key, ct);
        if (b is null) return NotFound();
        db.ContentBlocks.Remove(b);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{key}/image")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> UploadImage(string key, IFormFile file, CancellationToken ct)
    {
        try
        {
            var url = await uploads.SaveImageAsync(file, "content", key.Replace('.', '-'), ct);
            return Ok(new UploadResponse(url));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
