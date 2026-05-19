using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record OrderItemDto(string ProductSlug, string Title, int UnitPriceCents, int Quantity);

public record OrderDto(
    Guid Id,
    string Email,
    string? Name,
    string Status,
    int SubtotalCents,
    int DiscountCents,
    int TotalCents,
    string Currency,
    DateTime CreatedAt,
    DateTime? PaidAt,
    List<OrderItemDto> Items)
{
    public static OrderDto From(Order o) => new(
        o.Id, o.Email, o.Name, o.Status.ToString(),
        o.SubtotalCents, o.DiscountCents, o.TotalCents, o.Currency,
        o.CreatedAt, o.PaidAt,
        o.Items.Select(i => new OrderItemDto(i.ProductSlug, i.TitleAtPurchase, i.UnitPriceCents, i.Quantity)).ToList());
}
