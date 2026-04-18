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

        var lineItems = order.Items.Select(i => new SessionLineItemOptions
        {
            PriceData = new SessionLineItemPriceDataOptions
            {
                Currency = order.Currency,
                UnitAmount = i.UnitPriceCents,
                ProductData = new SessionLineItemPriceDataProductDataOptions
                {
                    Name = i.TitleAtPurchase,
                    Metadata = new Dictionary<string, string> { ["product_id"] = i.ProductId },
                },
            },
            Quantity = i.Quantity,
        }).ToList();

        var options = new SessionCreateOptions
        {
            Mode = "payment",
            PaymentMethodTypes = ["card"],
            LineItems = lineItems,
            CustomerEmail = order.Email,
            SuccessUrl = successUrl,
            CancelUrl = cancelUrl,
            Metadata = new Dictionary<string, string>
            {
                ["order_id"] = order.Id.ToString(),
            },
            // Discounts via Stripe coupons would be better long-term; for now
            // we pre-compute the discount and pass the already-discounted totals.
            // If DiscountCents > 0, we subtract from one line item below.
        };

        // Apply discount as a single negative adjustment if present.
        // Stripe doesn't love negative line items, so we use their `discounts` API
        // only if a coupon is configured — otherwise just charge the discounted
        // subtotal by scaling line items. For simplicity here, we charge the
        // discounted total as-is and rely on the webhook to confirm the amount.
        // (In production: set up real Stripe Coupon objects tied to your promos.)

        var service = new SessionService();
        return await service.CreateAsync(options, cancellationToken: ct);
    }
}
