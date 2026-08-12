using JovieJoy.Api.Data.Entities;
using Stripe.Checkout;

namespace JovieJoy.Api.Services;

public interface IStripeService
{
    Task<Session> CreateCheckoutSessionAsync(Order order, CancellationToken ct = default);
}

public class StripeService(IConfiguration config) : IStripeService
{
    public async Task<Session> CreateCheckoutSessionAsync(Order order, CancellationToken ct = default)
    {
        var successUrl = config["Stripe:SuccessUrl"]!;
        var cancelUrl = config["Stripe:CancelUrl"]!;

        var lineItems = BuildLineItems(order);

        var options = new SessionCreateOptions
        {
            Mode = "payment",
            LineItems = lineItems,
            CustomerEmail = order.Email,
            SuccessUrl = successUrl,
            CancelUrl = cancelUrl,
            Metadata = new Dictionary<string, string>
            {
                ["order_id"] = order.Id.ToString(),
            },
        };

        var service = new SessionService();
        return await service.CreateAsync(options, cancellationToken: ct);
    }

    public static List<SessionLineItemOptions> BuildLineItems(Order order)
    {
        var remainingDiscount = order.DiscountCents;
        var lineItems = new List<SessionLineItemOptions>();
        foreach (var item in order.Items)
        {
            if (item.UnitPriceCents <= 0 || item.Quantity <= 0)
                throw new InvalidOperationException("Stripe line items require a positive price and quantity.");

            var discountedUnits = Math.Min(
                item.Quantity,
                remainingDiscount / item.UnitPriceCents);
            if (discountedUnits > 0)
            {
                lineItems.Add(new SessionLineItemOptions
                {
                    PriceData = CreatePriceData(order.Currency, item, 0),
                    Quantity = discountedUnits,
                });
                remainingDiscount -= discountedUnits * item.UnitPriceCents;
            }

            var remainingUnits = item.Quantity - discountedUnits;
            if (remainingUnits > 0)
            {
                var partialDiscount = Math.Min(remainingDiscount, item.UnitPriceCents);
                if (partialDiscount > 0)
                {
                    lineItems.Add(CreateLineItem(order.Currency, item, item.UnitPriceCents - partialDiscount, 1));
                    remainingDiscount -= partialDiscount;
                    remainingUnits -= 1;
                }
                if (remainingUnits > 0)
                    lineItems.Add(CreateLineItem(order.Currency, item, item.UnitPriceCents, remainingUnits));
            }
        }

        var stripeTotal = lineItems.Aggregate(
            0L,
            (total, line) => checked(total +
                (line.PriceData!.UnitAmount ?? 0) * (line.Quantity ?? 0)));
        if (remainingDiscount != 0 || stripeTotal != order.TotalCents)
            throw new InvalidOperationException("The Stripe charge total does not match the order total.");
        return lineItems;
    }

    private static SessionLineItemOptions CreateLineItem(
        string currency,
        OrderItem item,
        long amount,
        long quantity) => new()
    {
        PriceData = CreatePriceData(currency, item, amount),
        Quantity = quantity,
    };

    private static SessionLineItemPriceDataOptions CreatePriceData(
        string currency,
        OrderItem item,
        long amount) => new()
    {
        Currency = currency,
        UnitAmount = amount,
        ProductData = new SessionLineItemPriceDataProductDataOptions
        {
            Name = item.TitleAtPurchase,
            Metadata = new Dictionary<string, string> { ["product_slug"] = item.ProductSlug },
        },
    };
}
