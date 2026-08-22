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
public class AdminContentController(
    AppDbContext db,
    IUploadService uploads,
    IAssetCleanupService assetCleanup) : ControllerBase
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
        if (ContentBlockPolicy.IsRetired(type))
            return BadRequest(new
            {
                error = $"Content block type '{type}' is retired. Use its dedicated CMS editor instead.",
            });

        var existing = await db.ContentBlocks.FirstOrDefaultAsync(b => b.Key == key, ct);
        var previousAssets = existing is null
            ? Array.Empty<string>()
            : AssetCleanupService.LocalUrls(existing.Data.RootElement);
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
        await assetCleanup.DeleteUnreferencedAsync(previousAssets, ct);

        var saved = await db.ContentBlocks.AsNoTracking().FirstAsync(b => b.Key == key, ct);
        return Ok(ContentBlockDto.From(saved));
    }

    [HttpDelete("{key}")]
    public async Task<IActionResult> Delete(string key, CancellationToken ct)
    {
        var b = await db.ContentBlocks.FirstOrDefaultAsync(b => b.Key == key, ct);
        if (b is null) return NotFound();
        var candidateAssets = AssetCleanupService.LocalUrls(b.Data.RootElement);
        db.ContentBlocks.Remove(b);
        await db.SaveChangesAsync(ct);
        await assetCleanup.DeleteUnreferencedAsync(candidateAssets, ct);
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

    // Leave headroom above the video cap for the multipart envelope.
    private const long VideoRequestLimit = UploadService.MaxVideoBytes + 4 * 1024 * 1024;

    [HttpPost("{key}/video")]
    [RequestSizeLimit(VideoRequestLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = VideoRequestLimit)]
    public async Task<ActionResult<UploadResponse>> UploadVideo(string key, IFormFile file, CancellationToken ct)
    {
        try
        {
            var url = await uploads.SaveVideoAsync(file, "content", key.Replace('.', '-'), ct);
            return Ok(new UploadResponse(url));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    // Chunked variant of the video upload for use behind Cloudflare, whose
    // per-request body cap (~100 MB) is far below the 1 GB video limit. The
    // client starts a session, appends sequential chunks, then completes it.
    private const long VideoChunkRequestLimit = 40 * 1024 * 1024;

    public sealed record CompleteVideoChunkSessionRequest(string FileName, string ContentType);

    [HttpPost("{key}/video/chunk-sessions")]
    public async Task<ActionResult<object>> BeginVideoChunkSession(string key, CancellationToken ct)
    {
        try
        {
            var uploadId = await uploads.BeginVideoChunkSessionAsync(ct);
            return Ok(new { uploadId });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{key}/video/chunk-sessions/{uploadId}")]
    [RequestSizeLimit(VideoChunkRequestLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = VideoChunkRequestLimit)]
    public async Task<ActionResult<object>> AppendVideoChunk(
        string key, string uploadId, IFormFile file, [FromForm] long offset, CancellationToken ct)
    {
        try
        {
            var received = await uploads.AppendVideoChunkAsync(uploadId, file, offset, ct);
            return Ok(new { received });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{key}/video/chunk-sessions/{uploadId}/complete")]
    public async Task<ActionResult<UploadResponse>> CompleteVideoChunkSession(
        string key, string uploadId, [FromBody] CompleteVideoChunkSessionRequest req, CancellationToken ct)
    {
        try
        {
            var url = await uploads.FinalizeVideoChunkSessionAsync(
                uploadId, req.FileName, req.ContentType, "content", key.Replace('.', '-'), ct);
            return Ok(new UploadResponse(url));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
