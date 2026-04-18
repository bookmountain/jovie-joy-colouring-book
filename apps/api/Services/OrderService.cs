using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Services;

public interface IOrderService
{
    // Creates a Pending order with server-trusted prices. Never trust client-supplied prices.
    Task<Order> CreatePendingOrderAsync(CheckoutRequest req, Guid? userId, CancellationToken ct = default);

    Task MarkPaidAsync(string stripeSessionId, string? paymentIntentId, CancellationToken ct = default);
    Task<Order?> GetByStripeSessionAsync(string stripeSessionId, CancellationToken ct = default);
}

public class OrderService(AppDbContext db) : IOrderService
{
    public async Task<Order> CreatePendingOrderAsync(CheckoutRequest req, Guid? userId, CancellationToken ct = default)
    {
        if (req.Items is null || req.Items.Count == 0)
            throw new ArgumentException("Cart is empty");

        var productIds = req.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await db.Products
            .Where(p => productIds.Contains(p.Id) && p.IsActive)
            .ToDictionaryAsync(p => p.Id, ct);

        if (products.Count != productIds.Count)
            throw new ArgumentException("One or more products not found or inactive");

        var order = new Order
        {
            UserId = userId,
            Email = req.Email.Trim().ToLowerInvariant(),
            Name = req.Name?.Trim(),
            Currency = "usd",
            Status = OrderStatus.Pending,
            PromoCode = string.IsNullOrWhiteSpace(req.PromoCode) ? null : req.PromoCode.Trim().ToUpperInvariant(),
        };

        foreach (var line in req.Items)
        {
            if (line.Quantity <= 0 || line.Quantity > 20)
                throw new ArgumentException($"Invalid quantity for {line.ProductId}");

            var p = products[line.ProductId];
            order.Items.Add(new OrderItem
            {
                ProductId = p.Id,
                Product = p,
                TitleAtPurchase = p.Title,
                UnitPriceCents = p.PriceCents,
                Quantity = line.Quantity,
            });
        }

        order.SubtotalCents = order.Items.Sum(i => i.UnitPriceCents * i.Quantity);

        // Hardcoded promo codes for now. Real app: a Promos table + per-code rules.
        order.DiscountCents = order.PromoCode switch
        {
            "FIRST10" => (int)Math.Round(order.SubtotalCents * 0.10),
            _ => 0,
        };

        order.TotalCents = order.SubtotalCents - order.DiscountCents;

        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return order;
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
