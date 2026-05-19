using System.Security.Claims;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/wishlist")]
[Authorize]
public class WishlistController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? throw new InvalidOperationException("No user id on token"));

    [HttpGet]
    public async Task<ActionResult<IEnumerable<WishlistItemDto>>> List(CancellationToken ct)
    {
        var userId = CurrentUserId();
        var items = await db.Wishlists.AsNoTracking()
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.AddedAt)
            .Select(w => new WishlistItemDto(w.ProductSlug, w.AddedAt))
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPut("{productSlug}")]
    public async Task<IActionResult> Add(string productSlug, CancellationToken ct)
    {
        var userId = CurrentUserId();
        var exists = await db.Wishlists.AnyAsync(w => w.UserId == userId && w.ProductSlug == productSlug, ct);
        if (!exists)
        {
            db.Wishlists.Add(new Wishlist { UserId = userId, ProductSlug = productSlug });
            await db.SaveChangesAsync(ct);
        }
        return NoContent();
    }

    [HttpDelete("{productSlug}")]
    public async Task<IActionResult> Remove(string productSlug, CancellationToken ct)
    {
        var userId = CurrentUserId();
        var row = await db.Wishlists.FirstOrDefaultAsync(w => w.UserId == userId && w.ProductSlug == productSlug, ct);
        if (row is not null)
        {
            db.Wishlists.Remove(row);
            await db.SaveChangesAsync(ct);
        }
        return NoContent();
    }

    [HttpPost("merge")]
    public async Task<IActionResult> Merge([FromBody] WishlistMergeRequest req, CancellationToken ct)
    {
        var userId = CurrentUserId();
        var existing = await db.Wishlists.Where(w => w.UserId == userId)
            .Select(w => w.ProductSlug).ToListAsync(ct);
        var existingSet = existing.ToHashSet();
        foreach (var slug in req.ProductSlugs.Distinct())
        {
            if (!existingSet.Contains(slug))
                db.Wishlists.Add(new Wishlist { UserId = userId, ProductSlug = slug });
        }
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
