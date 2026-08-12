using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;

namespace JovieJoy.Api.Tests;

public sealed class StripeServiceTests
{
    [Fact]
    public void BuildLineItems_matches_discounted_total_without_expanding_quantities()
    {
        var order = new Order
        {
            Currency = "usd",
            SubtotalCents = 5_000,
            DiscountCents = 500,
            TotalCents = 4_500,
            Items =
            [
                new OrderItem { ProductSlug = "a", TitleAtPurchase = "A", UnitPriceCents = 1_000, Quantity = 3 },
                new OrderItem { ProductSlug = "b", TitleAtPurchase = "B", UnitPriceCents = 500, Quantity = 4 },
            ],
        };

        var lines = StripeService.BuildLineItems(order);

        Assert.InRange(lines.Count, 1, order.Items.Count * 3);
        Assert.Equal(
            order.TotalCents,
            lines.Sum(line => (line.PriceData!.UnitAmount ?? 0) * (line.Quantity ?? 0)));
    }

    [Fact]
    public void BuildLineItems_rejects_an_inconsistent_order_total()
    {
        var order = new Order
        {
            Currency = "usd",
            SubtotalCents = 1_000,
            DiscountCents = 100,
            TotalCents = 999,
            Items =
            [
                new OrderItem { ProductSlug = "a", TitleAtPurchase = "A", UnitPriceCents = 1_000, Quantity = 1 },
            ],
        };

        Assert.Throws<InvalidOperationException>(() => StripeService.BuildLineItems(order));
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(100, 0)]
    public void BuildLineItems_rejects_nonpositive_price_or_quantity(int unitPriceCents, int quantity)
    {
        var order = new Order
        {
            Currency = "usd",
            TotalCents = Math.Max(0, unitPriceCents * quantity),
            Items =
            [
                new OrderItem
                {
                    ProductSlug = "invalid",
                    TitleAtPurchase = "Invalid",
                    UnitPriceCents = unitPriceCents,
                    Quantity = quantity,
                },
            ],
        };

        Assert.Throws<InvalidOperationException>(() => StripeService.BuildLineItems(order));
    }
}
