using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/admin/analytics")]
[Authorize(Policy = "AdminOnly")]
public class AdminAnalyticsController(AppDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public IActionResult Summary() => Ok(new
    {
        totalOrders = 0, paidOrders = 0, totalRevenueCents = 0,
        revenueThisMonthCents = 0, ordersThisMonth = 0,
        last30Days = Array.Empty<object>(), topProducts = Array.Empty<object>(),
    });

    [HttpGet("orders")]
    public IActionResult Orders() => Ok(new { items = Array.Empty<object>(), total = 0, page = 1, pageSize = 20 });
}
