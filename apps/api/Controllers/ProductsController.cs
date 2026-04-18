using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> List(CancellationToken ct)
    {
        var products = await db.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.Id)
            .ToListAsync(ct);
        return Ok(products.Select(ProductDto.From));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductDto>> Get(string id, CancellationToken ct)
    {
        var p = await db.Products.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        return p is null ? NotFound() : Ok(ProductDto.From(p));
    }
}
