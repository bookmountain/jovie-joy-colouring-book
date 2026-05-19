using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/admin/analytics")]
[Authorize(Policy = "AdminOnly")]
public class AdminAnalyticsController(AppDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var thirtyDaysAgo = now.AddDays(-30);

        var totalOrders = await db.Orders.CountAsync(ct);
        var paidOrders = await db.Orders.Where(o => o.Status == OrderStatus.Paid).CountAsync(ct);
        var totalRevenue = await db.Orders.Where(o => o.Status == OrderStatus.Paid).SumAsync(o => (int?)o.TotalCents, ct) ?? 0;
        var monthRevenue = await db.Orders.Where(o => o.Status == OrderStatus.Paid && o.CreatedAt >= monthStart).SumAsync(o => (int?)o.TotalCents, ct) ?? 0;
        var monthCount = await db.Orders.Where(o => o.CreatedAt >= monthStart).CountAsync(ct);

        var daily = await db.Orders
            .Where(o => o.Status == OrderStatus.Paid && o.CreatedAt >= thirtyDaysAgo)
            .GroupBy(o => o.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Revenue = g.Sum(o => o.TotalCents), Count = g.Count() })
            .OrderBy(d => d.Date)
            .ToListAsync(ct);

        var top = await db.OrderItems
            .Include(i => i.Order)
            .Where(i => i.Order.Status == OrderStatus.Paid)
            .GroupBy(i => new { i.ProductSlug, i.TitleAtPurchase })
            .Select(g => new
            {
                productSlug = g.Key.ProductSlug,
                title = g.Key.TitleAtPurchase,
                unitsSold = g.Sum(x => x.Quantity),
                revenueCents = g.Sum(x => x.UnitPriceCents * x.Quantity),
            })
            .OrderByDescending(t => t.revenueCents)
            .Take(10)
            .ToListAsync(ct);

        return Ok(new
        {
            totalOrders, paidOrders, totalRevenueCents = totalRevenue,
            revenueThisMonthCents = monthRevenue, ordersThisMonth = monthCount,
            last30Days = daily.Select(d => new { date = d.Date.ToString("yyyy-MM-dd"), revenueCents = d.Revenue, orders = d.Count }),
            topProducts = top,
        });
    }

    [HttpGet("orders")]
    public async Task<IActionResult> Orders([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var q = db.Orders.AsNoTracking().Include(o => o.Items).AsQueryable();
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var s))
            q = q.Where(o => o.Status == s);

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(o => new
            {
                id = o.Id, email = o.Email, status = o.Status.ToString(),
                totalCents = o.TotalCents, createdAt = o.CreatedAt, paidAt = o.PaidAt,
                items = o.Items.Select(i => new { productSlug = i.ProductSlug, title = i.TitleAtPurchase, qty = i.Quantity, unitPriceCents = i.UnitPriceCents }),
            })
            .ToListAsync(ct);

        return Ok(new { items, total, page, pageSize });
    }
}
