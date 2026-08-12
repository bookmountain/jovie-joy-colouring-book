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
public class AdminCollectionsController(
    AppDbContext db,
    IUploadService uploads,
    IAssetCleanupService assetCleanup) : ControllerBase
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
        await ClearSingletonSlotAsync(collection, ct);
        await SyncMembersAsync(collection, req.ProductOrder, ct);
        await db.SaveChangesAsync(ct);
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
        var previousHeroImage = c.HeroImage;

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
        await ClearSingletonSlotAsync(c, ct);
        await SyncMembersAsync(c, req.ProductOrder, ct);
        await db.SaveChangesAsync(ct);
        await assetCleanup.DeleteUnreferencedAsync([previousHeroImage], ct);
        return Ok(CollectionDto.From(c, req.ProductOrder));
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug, CancellationToken ct)
    {
        var c = await db.Collections.FirstOrDefaultAsync(c => c.Slug == slug, ct);
        if (c is null) return NotFound();
        db.Collections.Remove(c);
        await db.SaveChangesAsync(ct);
        await assetCleanup.DeleteUnreferencedAsync([c.HeroImage], ct);
        return NoContent();
    }

    [HttpPost("{slug}/hero-image")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> UploadHero(string slug, IFormFile file, CancellationToken ct)
    {
        var c = await db.Collections.FirstOrDefaultAsync(c => c.Slug == slug, ct);
        if (c is null) return NotFound();

        string url;
        try
        {
            url = await uploads.SaveImageAsync(file, "collections", slug, ct);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }

        var previousHeroImage = c.HeroImage;
        try
        {
            c.HeroImage = url;
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            c.HeroImage = previousHeroImage;
            db.Entry(c).State = EntityState.Unchanged;
            // The random URL was never committed or returned, so no CMS row can
            // legitimately reference it. Delete it directly and preserve the
            // original persistence exception.
            uploads.DeleteIfLocal(url);
            throw;
        }

        await assetCleanup.DeleteUnreferencedAsync([previousHeroImage], ct);
        return Ok(new UploadResponse(url));
    }

    private async Task SyncMembersAsync(Collection collection, List<string> productSlugs, CancellationToken ct)
    {
        var products = await db.Products.Where(p => productSlugs.Contains(p.Slug)).ToListAsync(ct);
        var existing = await db.ProductCollections.Where(pc => pc.CollectionId == collection.Id).ToListAsync(ct);
        var desiredIds = products.Select(product => product.Id).ToHashSet();
        db.ProductCollections.RemoveRange(existing.Where(row => !desiredIds.Contains(row.ProductId)));

        var existingIds = existing.Select(row => row.ProductId).ToHashSet();
        foreach (var product in products.Where(product => !existingIds.Contains(product.Id)))
        {
            db.ProductCollections.Add(new ProductCollection
            {
                ProductId = product.Id,
                Product = product,
                CollectionId = collection.Id,
                Collection = collection,
            });
        }
    }

    private async Task ClearSingletonSlotAsync(Collection selected, CancellationToken ct)
    {
        if (selected.HomepageSlot is null or HomepageSlot.Tile) return;

        var conflicts = await db.Collections
            .Where(collection =>
                collection.Id != selected.Id &&
                collection.HomepageSlot == selected.HomepageSlot)
            .ToListAsync(ct);
        foreach (var conflict in conflicts)
        {
            conflict.HomepageSlot = null;
            conflict.UpdatedAt = DateTime.UtcNow;
        }
    }
}
