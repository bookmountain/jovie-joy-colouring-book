using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminAnalyticsController(AppDbContext db) : ControllerBase
{
    [HttpGet("analytics")]
    public async Task<ActionResult<AnalyticsSummaryDto>> GetAnalytics(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var thirtyDaysAgo = now.AddDays(-30).Date;

        var paidOrders = await db.Orders
            .AsNoTracking()
            .Where(o => o.Status == OrderStatus.Paid)
            .Include(o => o.Items)
            .ToListAsync(ct);

        var totalOrders = await db.Orders.CountAsync(ct);
        var totalRevenue = paidOrders.Sum(o => o.TotalCents);
        var revenueThisMonth = paidOrders
            .Where(o => o.PaidAt >= monthStart)
            .Sum(o => o.TotalCents);
        var ordersThisMonth = paidOrders.Count(o => o.PaidAt >= monthStart);

        // Last 30 days grouped by date
        var last30Days = paidOrders
            .Where(o => o.PaidAt.HasValue && o.PaidAt.Value.Date >= thirtyDaysAgo)
            .GroupBy(o => o.PaidAt!.Value.Date)
            .Select(g => new DailyRevenueDto(
                g.Key.ToString("yyyy-MM-dd"),
                g.Sum(o => o.TotalCents),
                g.Count()))
            .OrderBy(d => d.Date)
            .ToList();

        // Fill missing days with zero
        var filledDays = Enumerable.Range(0, 30)
            .Select(i => thirtyDaysAgo.AddDays(i).ToString("yyyy-MM-dd"))
            .Select(date => last30Days.FirstOrDefault(d => d.Date == date)
                           ?? new DailyRevenueDto(date, 0, 0))
            .ToList();

        // Top products by revenue
        var topProducts = paidOrders
            .SelectMany(o => o.Items)
            .GroupBy(i => i.ProductId)
            .Select(g => new TopProductDto(
                g.Key,
                g.First().TitleAtPurchase,
                g.Sum(i => i.Quantity),
                g.Sum(i => i.UnitPriceCents * i.Quantity)))
            .OrderByDescending(t => t.RevenueCents)
            .Take(5)
            .ToList();

        return Ok(new AnalyticsSummaryDto(
            totalOrders, paidOrders.Count, totalRevenue,
            revenueThisMonth, ordersThisMonth,
            filledDays, topProducts));
    }

    [HttpGet("orders")]
    public async Task<ActionResult> GetOrders(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        CancellationToken ct = default)
    {
        IQueryable<Order> query = db.Orders.AsNoTracking().Include(o => o.Items);

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<OrderStatus>(status, true, out var s))
            query = query.Where(o => o.Status == s);

        var total = await query.CountAsync(ct);
        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return Ok(new
        {
            total,
            page,
            pageSize,
            items = orders.Select(OrderDto.From),
        });
    }
}
