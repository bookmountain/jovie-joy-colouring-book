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
    public async Task<IActionResult> Orders(
        [FromQuery] string? status,
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = db.Orders.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var s))
            query = query.Where(o => o.Status == s);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim().ToLower();
            var parsedId = Guid.TryParse(q.Trim(), out var orderId) ? orderId : (Guid?)null;
            query = query.Where(o =>
                o.Email.ToLower().Contains(needle) ||
                (o.Name != null && o.Name.ToLower().Contains(needle)) ||
                (parsedId.HasValue && o.Id == parsedId.Value));
        }

        var total = await query.CountAsync(ct);
        var now = DateTime.UtcNow;
        var rows = await query.OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(o => new
            {
                id = o.Id, email = o.Email, status = o.Status.ToString(),
                totalCents = o.TotalCents, createdAt = o.CreatedAt, paidAt = o.PaidAt,
                downloadEmailSentAt = o.DownloadEmailSentAt,
                digitalItemCount = o.Items.Count(i => i.DigitalFilePathAtPurchase != null && i.DigitalFilePathAtPurchase != ""),
                downloadGrantCount = o.DownloadGrants.Count,
                activeDownloadGrantCount = o.DownloadGrants.Count(grant => grant.ExpiresAt > now),
                expiredDownloadGrantCount = o.DownloadGrants.Count(grant => grant.ExpiresAt <= now),
                items = o.Items.Select(i => new { productSlug = i.ProductSlug, title = i.TitleAtPurchase, qty = i.Quantity, unitPriceCents = i.UnitPriceCents }),
            })
            .ToListAsync(ct);

        var items = rows.Select(o => new
        {
            o.id,
            o.email,
            o.status,
            o.totalCents,
            o.createdAt,
            o.paidAt,
            o.downloadEmailSentAt,
            o.digitalItemCount,
            o.downloadGrantCount,
            o.activeDownloadGrantCount,
            o.expiredDownloadGrantCount,
            deliveryStatus = DeliveryStatus(
                o.status,
                o.digitalItemCount,
                o.downloadGrantCount,
                o.activeDownloadGrantCount,
                o.expiredDownloadGrantCount,
                o.downloadEmailSentAt),
            o.items,
        });

        return Ok(new { items, total, page, pageSize });
    }

    private static string DeliveryStatus(
        string orderStatus,
        int digitalItemCount,
        int grantCount,
        int activeGrantCount,
        int expiredGrantCount,
        DateTime? downloadEmailSentAt)
    {
        if (digitalItemCount == 0) return "not_applicable";
        if (string.Equals(orderStatus, nameof(OrderStatus.Refunded), StringComparison.OrdinalIgnoreCase)) return "revoked";
        if (string.Equals(orderStatus, nameof(OrderStatus.Failed), StringComparison.OrdinalIgnoreCase)) return "payment_failed";
        if (!string.Equals(orderStatus, nameof(OrderStatus.Paid), StringComparison.OrdinalIgnoreCase)) return "awaiting_payment";
        if (activeGrantCount > 0 && expiredGrantCount > 0) return "partially_expired";
        if (activeGrantCount > 0) return downloadEmailSentAt.HasValue ? "delivered" : "ready_to_send";
        return grantCount > 0 ? "expired" : "ready_to_send";
    }
}
