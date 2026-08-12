using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/search")]
[Authorize(Policy = "AdminOnly")]
public class AdminSearchController(AppDbContext db) : ControllerBase
{
    private static readonly AdminSearchResultDto[] CmsRoutes =
    [
        new("cms", "dashboard", "Dashboard", "Overview and sales analytics", "/admin"),
        new("cms", "products", "Products", "Product catalog CMS", "/admin/products"),
        new("cms", "collections", "Collections", "Collection CMS", "/admin/collections"),
        new("cms", "orders", "Orders", "Commerce orders", "/admin/orders"),
        new("cms", "customers", "Customers", "Registered and guest customers", "/admin/customers"),
        new("cms", "notify-me", "Notify me", "Back-in-stock requests", "/admin/notify-me"),
        new("cms", "subscribers", "Subscribers", "Newsletter subscribers", "/admin/subscribers"),
        new("cms", "home", "Home page", "Homepage content CMS", "/admin/pages/home"),
        new("cms", "about", "About page", "About content CMS", "/admin/about"),
        new("cms", "freebies", "Freebies page", "Freebie catalog CMS", "/admin/freebies"),
        new("cms", "header", "Header", "Brand and search prompt CMS", "/admin/pages/header"),
        new("cms", "navigation", "Navigation", "Storefront navigation CMS", "/admin/navigation"),
        new("cms", "footer", "Footer", "Footer links and contact CMS", "/admin/pages/footer"),
        new("cms", "announcement", "Announcement", "Announcement bar CMS", "/admin/pages/announcement"),
        new("cms", "newsletter", "Newsletter", "Newsletter copy CMS", "/admin/pages/newsletter"),
        new("cms", "blog", "Blog", "Blog categories and articles", "/admin/blog"),
        new("cms", "comics", "Comics", "Comic worlds CMS", "/admin/comics"),
        new("cms", "gallery", "Gallery", "Gallery image CMS", "/admin/gallery"),
        new("cms", "faq", "FAQ", "Frequently asked questions CMS", "/admin/faq"),
        new("cms", "featured-on", "Featured On", "Press badge CMS", "/admin/featured-on"),
        new("cms", "static-pages", "Static pages", "General page CMS", "/admin/static-pages"),
        new("cms", "content", "Content blocks", "Advanced content CMS", "/admin/content"),
    ];

    [HttpGet]
    public async Task<ActionResult<AdminSearchResponse>> Search(
        [FromQuery] string? q,
        [FromQuery] int limit = 12,
        CancellationToken ct = default)
    {
        var query = q?.Trim() ?? "";
        if (query.Length < 2)
            return Ok(new AdminSearchResponse([]));
        if (query.Length > 100)
            return BadRequest(new { error = "Search query cannot exceed 100 characters." });
        limit = Math.Clamp(limit, 1, 20);
        var needle = query.ToLowerInvariant();

        var productRows = await db.Products.AsNoTracking()
            .Where(product =>
                product.Title.ToLower().Contains(needle) ||
                product.Slug.ToLower().Contains(needle))
            .OrderByDescending(product => product.UpdatedAt)
            .Take(limit)
            .Select(product => new { product.Slug, product.Title, product.ProductType })
            .ToListAsync(ct);

        var parsedOrderId = Guid.TryParse(query, out var orderId) ? orderId : (Guid?)null;
        var orderRows = await db.Orders.AsNoTracking()
            .Where(order =>
                order.Email.ToLower().Contains(needle) ||
                (order.Name != null && order.Name.ToLower().Contains(needle)) ||
                (parsedOrderId.HasValue && order.Id == parsedOrderId.Value))
            .OrderByDescending(order => order.CreatedAt)
            .Take(limit)
            .Select(order => new
            {
                order.Id,
                order.Email,
                order.Status,
                order.TotalCents,
            })
            .ToListAsync(ct);

        var accountRows = await db.Users.AsNoTracking()
            .Where(user => !user.IsAdmin &&
                (user.Email.ToLower().Contains(needle) ||
                 (user.Name != null && user.Name.ToLower().Contains(needle))))
            .OrderByDescending(user => user.CreatedAt)
            .Take(limit)
            .Select(user => new { user.Email, user.Name })
            .ToListAsync(ct);

        var guestRows = await db.Orders.AsNoTracking()
            .Where(order =>
                order.Email.ToLower().Contains(needle) ||
                (order.Name != null && order.Name.ToLower().Contains(needle)))
            .GroupBy(order => order.Email.ToUpper())
            .Select(group => new
            {
                Email = group.Max(order => order.Email)!,
                Name = group.Max(order => order.Name),
                LastOrderAt = group.Max(order => order.CreatedAt),
            })
            .OrderByDescending(customer => customer.LastOrderAt)
            .Take(limit)
            .ToListAsync(ct);

        var candidates = new List<AdminSearchResultDto>();
        candidates.AddRange(productRows.Select(product => new AdminSearchResultDto(
            "product",
            product.Slug,
            product.Title,
            $"{product.ProductType} · /{product.Slug}",
            $"/admin/products/{Uri.EscapeDataString(product.Slug)}")));
        candidates.AddRange(orderRows.Select(order => new AdminSearchResultDto(
            "order",
            order.Id.ToString(),
            $"Order {order.Id.ToString()[..8]}",
            $"{order.Email} · {order.Status} · ${(order.TotalCents / 100m).ToString("0.00", CultureInfo.InvariantCulture)}",
            $"/admin/orders?q={order.Id}&order={order.Id}")));

        var customers = new Dictionary<string, AdminSearchResultDto>(StringComparer.OrdinalIgnoreCase);
        foreach (var account in accountRows)
        {
            customers[account.Email] = new AdminSearchResultDto(
                "customer",
                account.Email,
                account.Name ?? account.Email,
                $"{account.Email} · Registered customer",
                $"/admin/customers?q={Uri.EscapeDataString(account.Email)}");
        }
        foreach (var guest in guestRows)
        {
            customers.TryAdd(guest.Email, new AdminSearchResultDto(
                "customer",
                guest.Email,
                guest.Name ?? guest.Email,
                $"{guest.Email} · Guest purchaser",
                $"/admin/customers?q={Uri.EscapeDataString(guest.Email)}"));
        }
        candidates.AddRange(customers.Values.Take(limit));
        candidates.AddRange(CmsRoutes.Where(route =>
            route.Title.Contains(query, StringComparison.OrdinalIgnoreCase) ||
            route.Subtitle.Contains(query, StringComparison.OrdinalIgnoreCase)));

        var results = candidates
            .DistinctBy(item => $"{item.Type}:{item.Id}", StringComparer.OrdinalIgnoreCase)
            .OrderBy(item => MatchRank(item, query))
            .ThenBy(item => item.Title, StringComparer.OrdinalIgnoreCase)
            .Take(limit)
            .ToList();
        return Ok(new AdminSearchResponse(results));
    }

    private static int MatchRank(AdminSearchResultDto item, string query)
    {
        if (item.Title.Equals(query, StringComparison.OrdinalIgnoreCase)) return 0;
        if (item.Title.StartsWith(query, StringComparison.OrdinalIgnoreCase)) return 1;
        if (item.Subtitle.StartsWith(query, StringComparison.OrdinalIgnoreCase)) return 2;
        return 3;
    }
}
