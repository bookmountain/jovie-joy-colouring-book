using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/collections")]
public class CollectionsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CollectionDto>>> List(CancellationToken ct)
    {
        var collections = await db.Collections
            .AsNoTracking()
            .OrderBy(c => c.SortIndex)
            .ToListAsync(ct);
        return Ok(collections.Select(c => CollectionDto.From(c)));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<CollectionWithProductsDto>> Get(string slug, CancellationToken ct)
    {
        var collection = await db.Collections
            .AsNoTrackingWithIdentityResolution()
            .Include(c => c.ProductCollections).ThenInclude(pc => pc.Product)
                .ThenInclude(p => p.ProductCollections).ThenInclude(pc => pc.Collection)
            .FirstOrDefaultAsync(c => c.Slug == slug, ct);

        if (collection is null) return NotFound();

        var now = DateTime.UtcNow;
        var members = collection.ProductCollections
            .Select(pc => pc.Product)
            .Where(p => p.PublishedAt != null && p.PublishedAt <= now)
            .ToList();

        List<Data.Entities.Product> ordered;
        if (collection.ProductOrder.Count > 0)
        {
            var bySlug = members.ToDictionary(p => p.Slug);
            ordered = collection.ProductOrder
                .Where(bySlug.ContainsKey)
                .Select(s => bySlug[s])
                .Concat(members.Where(p => !collection.ProductOrder.Contains(p.Slug)))
                .ToList();
        }
        else
        {
            ordered = collection.DefaultSort switch
            {
                Data.Entities.SortKey.PriceAscending => members.OrderBy(p => p.PriceCents).ToList(),
                Data.Entities.SortKey.PriceDescending => members.OrderByDescending(p => p.PriceCents).ToList(),
                Data.Entities.SortKey.TitleDescending => members.OrderByDescending(p => p.Title).ToList(),
                Data.Entities.SortKey.CreatedAscending => members.OrderBy(p => p.PublishedAt).ToList(),
                Data.Entities.SortKey.CreatedDescending => members.OrderByDescending(p => p.PublishedAt).ToList(),
                _ => members.OrderBy(p => p.Title).ToList(),
            };
        }

        return Ok(new CollectionWithProductsDto(
            CollectionDto.From(collection, ordered.Select(p => p.Slug)),
            ordered.Select(p => ProductDto.From(p)).ToList()));
    }
}
