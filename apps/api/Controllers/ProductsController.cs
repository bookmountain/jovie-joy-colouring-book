using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(AppDbContext db) : ControllerBase
{
    private static IQueryable<Data.Entities.Product> Published(IQueryable<Data.Entities.Product> query)
    {
        var now = DateTime.UtcNow;
        return query.Where(p => p.PublishedAt != null && p.PublishedAt <= now);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> List(
        [FromQuery] string? collection,
        [FromQuery] string? sort,
        CancellationToken ct)
    {
        var query = db.Products
            .AsNoTracking()
            .Include(p => p.ProductCollections).ThenInclude(pc => pc.Collection)
            .AsQueryable();

        query = Published(query);

        if (!string.IsNullOrWhiteSpace(collection))
            query = query.Where(p => p.ProductCollections.Any(pc => pc.Collection.Slug == collection));

        query = sort switch
        {
            "price-ascending" => query.OrderBy(p => p.PriceCents),
            "price-descending" => query.OrderByDescending(p => p.PriceCents),
            "title-ascending" => query.OrderBy(p => p.Title),
            "title-descending" => query.OrderByDescending(p => p.Title),
            "created-ascending" => query.OrderBy(p => p.PublishedAt),
            "created-descending" => query.OrderByDescending(p => p.PublishedAt),
            _ => query.OrderByDescending(p => p.PublishedAt),
        };

        var products = await query.ToListAsync(ct);
        return Ok(products.Select(p => ProductDto.From(p)));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<ProductDto>> Get(string slug, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var product = await db.Products
            .AsNoTracking()
            .Include(p => p.ProductCollections).ThenInclude(pc => pc.Collection)
            .Where(p => p.PublishedAt != null && p.PublishedAt <= now)
            .FirstOrDefaultAsync(p => p.Slug == slug, ct);

        return product is null ? NotFound() : Ok(ProductDto.From(product));
    }
}
