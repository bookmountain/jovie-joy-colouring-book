using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Stripe.Checkout;

namespace JovieJoy.Api.Services;

public interface IOrderService
{
    Task<(Order order, Session session)> CreateAsync(CheckoutRequest req, Guid? userId, CancellationToken ct = default);
    Task MarkPaidAsync(string stripeSessionId, string? paymentIntentId, CancellationToken ct = default);
    Task<Order?> GetByStripeSessionAsync(string stripeSessionId, CancellationToken ct = default);
}

public class OrderService(AppDbContext db, IStripeService stripe) : IOrderService
{
    public async Task<(Order, Session)> CreateAsync(CheckoutRequest req, Guid? userId, CancellationToken ct = default)
    {
        if (req.Items.Count == 0)
            throw new InvalidOperationException("Cart is empty");

        var slugs = req.Items.Select(i => i.ProductSlug).Distinct().ToList();
        var products = await db.Products
            .Where(p => slugs.Contains(p.Slug) && p.Available)
            .ToListAsync(ct);
        var bySlug = products.ToDictionary(p => p.Slug);

        var lineItems = new List<OrderItem>();
        int subtotal = 0;
        foreach (var line in req.Items)
        {
            if (!bySlug.TryGetValue(line.ProductSlug, out var p))
                throw new InvalidOperationException($"Unknown product: {line.ProductSlug}");
            if (line.Quantity <= 0)
                throw new InvalidOperationException("Quantity must be positive");

            lineItems.Add(new OrderItem
            {
                ProductId = p.Id,
                ProductSlug = p.Slug,
                TitleAtPurchase = p.Title,
                UnitPriceCents = p.PriceCents,
                Quantity = line.Quantity,
            });
            subtotal += p.PriceCents * line.Quantity;
        }

        int discount = 0;
        if (string.Equals(req.PromoCode, "FIRST10", StringComparison.OrdinalIgnoreCase))
            discount = (int)Math.Round(subtotal * 0.10);

        var order = new Order
        {
            Email = req.Email,
            Name = req.Name,
            UserId = userId,
            SubtotalCents = subtotal,
            DiscountCents = discount,
            TotalCents = subtotal - discount,
            Currency = "usd",
            Status = OrderStatus.Pending,
            PromoCode = req.PromoCode,
            Items = lineItems,
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);

        var session = await stripe.CreateCheckoutSessionAsync(order, ct);
        order.StripeSessionId = session.Id;
        await db.SaveChangesAsync(ct);

        return (order, session);
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
        if (order.Status == OrderStatus.Paid) return;

        order.Status = OrderStatus.Paid;
        order.PaidAt = DateTime.UtcNow;
        order.StripePaymentIntentId = paymentIntentId;
        await db.SaveChangesAsync(ct);
    }
}
