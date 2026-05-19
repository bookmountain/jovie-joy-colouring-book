using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Services;

public interface IOrderService
{
    // Creates a Pending order with server-trusted prices. Never trust client-supplied prices.
    Task<Order> CreatePendingOrderAsync(string email, string? name, Guid? userId, CancellationToken ct = default);

    Task MarkPaidAsync(string stripeSessionId, string? paymentIntentId, CancellationToken ct = default);
    Task<Order?> GetByStripeSessionAsync(string stripeSessionId, CancellationToken ct = default);
}

public class OrderService(AppDbContext db) : IOrderService
{
    public Task<Order> CreatePendingOrderAsync(string email, string? name, Guid? userId, CancellationToken ct = default)
    {
        throw new NotImplementedException("Rewritten in Task 30 (slug-based checkout)");
    }

    public async Task<Order?> GetByStripeSessionAsync(string stripeSessionId, CancellationToken ct = default)
    {
        return await db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.StripeSessionId == stripeSessionId, ct);
    }

    public async Task MarkPaidAsync(string stripeSessionId, string? paymentIntentId, CancellationToken ct = default)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.StripeSessionId == stripeSessionId, ct);
        if (order is null) return;
        if (order.Status == OrderStatus.Paid) return; // idempotent — webhooks can fire twice

        order.Status = OrderStatus.Paid;
        order.PaidAt = DateTime.UtcNow;
        order.StripePaymentIntentId = paymentIntentId;

        await db.SaveChangesAsync(ct);
    }
}
