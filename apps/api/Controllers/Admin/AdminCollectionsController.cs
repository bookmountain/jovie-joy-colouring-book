using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/collections")]
[Authorize(Policy = "AdminOnly")]
public class AdminCollectionsController(AppDbContext db, IUploadService uploads) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CollectionDto>>> List(CancellationToken ct)
    {
        var collections = await db.Collections.AsNoTracking()
            .Include(c => c.ProductCollections).ThenInclude(pc => pc.Product)
            .OrderBy(c => c.SortIndex)
            .ToListAsync(ct);
        return Ok(collections.Select(c =>
            CollectionDto.From(c, c.ProductCollections.Select(pc => pc.Product.Slug))));
    }

    [HttpPost]
    public async Task<ActionResult<CollectionDto>> Create([FromBody] CreateCollectionRequest req, CancellationToken ct)
    {
        if (await db.Collections.AnyAsync(c => c.Slug == req.Slug, ct))
            return Conflict(new { error = $"Slug '{req.Slug}' already in use" });

        if (!Enum.TryParse<SortKey>(req.DefaultSort, ignoreCase: true, out var sort))
            return BadRequest(new { error = $"Unknown sort '{req.DefaultSort}'" });

        HomepageSlot? slot = null;
        if (!string.IsNullOrEmpty(req.HomepageSlot))
        {
            if (!Enum.TryParse<HomepageSlot>(req.HomepageSlot, ignoreCase: true, out var parsed))
                return BadRequest(new { error = $"Unknown slot '{req.HomepageSlot}'" });
            slot = parsed;
        }

        var collection = new Collection
        {
            Slug = req.Slug, Title = req.Title, Excerpt = req.Excerpt,
            HeroImage = req.HeroImage, DefaultSort = sort, HomepageSlot = slot,
            ProductOrder = req.ProductOrder, SortIndex = req.SortIndex,
        };
        db.Collections.Add(collection);
        await db.SaveChangesAsync(ct);

        await SyncMembersAsync(collection, req.ProductOrder, ct);
        return CreatedAtAction(nameof(Get), new { slug = collection.Slug },
            CollectionDto.From(collection, req.ProductOrder));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<CollectionDto>> Get(string slug, CancellationToken ct)
    {
        var c = await db.Collections.AsNoTracking()
            .Include(c => c.ProductCollections).ThenInclude(pc => pc.Product)
            .FirstOrDefaultAsync(c => c.Slug == slug, ct);
        return c is null ? NotFound() : Ok(CollectionDto.From(c, c.ProductCollections.Select(pc => pc.Product.Slug)));
    }

    [HttpPut("{slug}")]
    public async Task<ActionResult<CollectionDto>> Update(string slug, [FromBody] UpdateCollectionRequest req, CancellationToken ct)
    {
        var c = await db.Collections.FirstOrDefaultAsync(c => c.Slug == slug, ct);
        if (c is null) return NotFound();

        if (!Enum.TryParse<SortKey>(req.DefaultSort, ignoreCase: true, out var sort))
            return BadRequest(new { error = $"Unknown sort '{req.DefaultSort}'" });

        HomepageSlot? slot = null;
        if (!string.IsNullOrEmpty(req.HomepageSlot))
        {
            if (!Enum.TryParse<HomepageSlot>(req.HomepageSlot, ignoreCase: true, out var parsed))
                return BadRequest(new { error = $"Unknown slot '{req.HomepageSlot}'" });
            slot = parsed;
        }

        c.Title = req.Title; c.Excerpt = req.Excerpt;
        c.HeroImage = req.HeroImage;
        c.DefaultSort = sort; c.HomepageSlot = slot;
        c.ProductOrder = req.ProductOrder;
        c.SortIndex = req.SortIndex;
        c.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        await SyncMembersAsync(c, req.ProductOrder, ct);
        return Ok(CollectionDto.From(c, req.ProductOrder));
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug, CancellationToken ct)
    {
        var c = await db.Collections.FirstOrDefaultAsync(c => c.Slug == slug, ct);
        if (c is null) return NotFound();
        db.Collections.Remove(c);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{slug}/hero-image")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> UploadHero(string slug, IFormFile file, CancellationToken ct)
    {
        var c = await db.Collections.FirstOrDefaultAsync(c => c.Slug == slug, ct);
        if (c is null) return NotFound();
        try
        {
            uploads.DeleteIfLocal(c.HeroImage);
            var url = await uploads.SaveImageAsync(file, "collections", slug, ct);
            c.HeroImage = url;
            await db.SaveChangesAsync(ct);
            return Ok(new UploadResponse(url));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    private async Task SyncMembersAsync(Collection collection, List<string> productSlugs, CancellationToken ct)
    {
        var products = await db.Products.Where(p => productSlugs.Contains(p.Slug)).ToListAsync(ct);
        var existing = await db.ProductCollections.Where(pc => pc.CollectionId == collection.Id).ToListAsync(ct);
        db.ProductCollections.RemoveRange(existing);
        foreach (var p in products)
            db.ProductCollections.Add(new ProductCollection { ProductId = p.Id, CollectionId = collection.Id });
        await db.SaveChangesAsync(ct);
    }
}
