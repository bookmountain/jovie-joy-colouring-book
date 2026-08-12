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
public class AdminAudienceController(AppDbContext db) : ControllerBase
{
    [HttpGet("customers")]
    public async Task<ActionResult<AdminPagedResponse<AdminCustomerListItem>>> Customers(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        (page, pageSize) = NormalizePage(page, pageSize);

        // Fetch one row per account and one aggregate row per checkout email, then
        // merge them case-insensitively. This keeps guest purchasers visible while
        // avoiding materialising individual orders.
        var accounts = await db.Users.AsNoTracking()
            .Select(user => new
            {
                user.Email,
                user.Name,
                user.CreatedAt,
                user.IsAdmin,
            })
            .ToListAsync(ct);

        var orderRollups = await db.Orders.AsNoTracking()
            .GroupBy(order => order.Email.ToUpper())
            .Select(group => new
            {
                Email = group.Max(order => order.Email),
                Name = group.Max(order => order.Name),
                OrderCount = group.Count(),
                LifetimeSpendCents = group.Sum(order =>
                    order.Status == OrderStatus.Paid ? order.TotalCents : 0),
                LastOrderAt = group.Max(order => (DateTime?)order.CreatedAt),
            })
            .ToListAsync(ct);

        var adminEmails = accounts
            .Where(account => account.IsAdmin)
            .Select(account => account.Email)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var customers = new Dictionary<string, CustomerAccumulator>(StringComparer.OrdinalIgnoreCase);

        foreach (var account in accounts.Where(account => !account.IsAdmin))
        {
            customers[account.Email] = new CustomerAccumulator
            {
                Email = account.Email,
                Name = account.Name,
                Registered = true,
                JoinedAt = account.CreatedAt,
            };
        }

        foreach (var rollup in orderRollups)
        {
            if (string.IsNullOrWhiteSpace(rollup.Email) || adminEmails.Contains(rollup.Email))
                continue;

            if (!customers.TryGetValue(rollup.Email, out var customer))
            {
                customer = new CustomerAccumulator { Email = rollup.Email };
                customers[rollup.Email] = customer;
            }

            customer.Name ??= rollup.Name;
            customer.OrderCount += rollup.OrderCount;
            customer.LifetimeSpendCents += rollup.LifetimeSpendCents;
            if (customer.LastOrderAt is null || rollup.LastOrderAt > customer.LastOrderAt)
                customer.LastOrderAt = rollup.LastOrderAt;
        }

        IEnumerable<CustomerAccumulator> filtered = customers.Values;
        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim();
            filtered = filtered.Where(customer =>
                customer.Email.Contains(needle, StringComparison.OrdinalIgnoreCase) ||
                (customer.Name?.Contains(needle, StringComparison.OrdinalIgnoreCase) ?? false));
        }

        var ordered = filtered
            .OrderByDescending(customer => customer.LastOrderAt ?? customer.JoinedAt ?? DateTime.MinValue)
            .ThenBy(customer => customer.Email, StringComparer.OrdinalIgnoreCase)
            .ToList();
        var total = ordered.Count;
        var items = ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(customer => new AdminCustomerListItem(
                customer.Email,
                customer.Name,
                customer.Registered,
                customer.OrderCount,
                customer.LifetimeSpendCents,
                customer.LastOrderAt,
                customer.JoinedAt))
            .ToList();

        return Ok(new AdminPagedResponse<AdminCustomerListItem>(items, total, page, pageSize));
    }

    [HttpGet("notify-me")]
    public async Task<ActionResult<AdminPagedResponse<AdminNotifyMeListItem>>> NotifyMe(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        (page, pageSize) = NormalizePage(page, pageSize);
        var query =
            from request in db.NotifyMeRequests.AsNoTracking()
            join product in db.Products.AsNoTracking()
                on request.ProductSlug equals product.Slug into productMatches
            from product in productMatches.DefaultIfEmpty()
            select new
            {
                request.Id,
                request.Email,
                request.ProductSlug,
                ProductTitle = product == null ? null : product.Title,
                request.CreatedAt,
            };

        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim().ToLower();
            query = query.Where(row =>
                row.Email.ToLower().Contains(needle) ||
                row.ProductSlug.ToLower().Contains(needle) ||
                (row.ProductTitle != null && row.ProductTitle.ToLower().Contains(needle)));
        }

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(row => row.CreatedAt)
            .ThenBy(row => row.Email)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        var items = rows.Select(row => new AdminNotifyMeListItem(
            row.Id,
            row.Email,
            row.ProductSlug,
            row.ProductTitle,
            row.CreatedAt)).ToList();

        return Ok(new AdminPagedResponse<AdminNotifyMeListItem>(items, total, page, pageSize));
    }

    [HttpGet("subscribers")]
    public async Task<ActionResult<AdminPagedResponse<AdminSubscriberListItem>>> Subscribers(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        (page, pageSize) = NormalizePage(page, pageSize);
        var query = db.NewsletterSubscribers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim().ToLower();
            query = query.Where(subscriber => subscriber.Email.ToLower().Contains(needle));
        }

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(subscriber => subscriber.CreatedAt)
            .ThenBy(subscriber => subscriber.Email)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        var items = rows.Select(subscriber =>
            new AdminSubscriberListItem(subscriber.Email, subscriber.CreatedAt)).ToList();

        return Ok(new AdminPagedResponse<AdminSubscriberListItem>(items, total, page, pageSize));
    }

    private static (int Page, int PageSize) NormalizePage(int page, int pageSize) =>
        (Math.Max(1, page), Math.Clamp(pageSize, 1, 100));

    private sealed class CustomerAccumulator
    {
        public required string Email { get; init; }
        public string? Name { get; set; }
        public bool Registered { get; init; }
        public int OrderCount { get; set; }
        public int LifetimeSpendCents { get; set; }
        public DateTime? LastOrderAt { get; set; }
        public DateTime? JoinedAt { get; init; }
    }
}
