using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record ProductDto(
    string Id,
    string Title,
    int PriceCents,
    int Pages,
    string Age,
    string Theme,
    string Difficulty,
    string Color,
    string Accent,
    string? Badge,
    string Description,
    bool IsActive,
    string? PdfStorageKey)
{
    public static ProductDto From(Product p) => new(
        p.Id, p.Title, p.PriceCents, p.Pages, p.AgeRange,
        p.Theme, p.Difficulty, p.Color, p.Accent, p.Badge, p.Description,
        p.IsActive, p.PdfStorageKey);
}

public record UserDto(Guid Id, string Email, string? Name, string? AvatarUrl, bool IsAdmin)
{
    public static UserDto From(User u) => new(u.Id, u.Email, u.Name, u.AvatarUrl, u.IsAdmin);
}

public record AuthResponse(string Token, UserDto User);

public record AdminLoginRequest(string Email, string Password);

public record CartLineRequest(string ProductId, int Quantity);

public record CheckoutRequest(
    string Email,
    string? Name,
    List<CartLineRequest> Items,
    string? PromoCode);

public record CheckoutResponse(string CheckoutUrl, Guid OrderId);

public record OrderItemDto(string ProductId, string Title, int UnitPriceCents, int Quantity);

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
        o.Items.Select(i => new OrderItemDto(i.ProductId, i.TitleAtPurchase, i.UnitPriceCents, i.Quantity)).ToList());
}

public record SiteContentDto(string Key, string Value, string Type, DateTime UpdatedAt)
{
    public static SiteContentDto From(SiteContent c) => new(c.Key, c.Value, c.Type, c.UpdatedAt);
}

public record UpsertContentRequest(string Value);

public record CreateProductRequest(
    string Id,
    string Title,
    int PriceCents,
    int Pages,
    string AgeRange,
    string Theme,
    string Difficulty,
    string Color,
    string Accent,
    string? Badge,
    string Description);

public record UpdateProductRequest(
    string Title,
    int PriceCents,
    int Pages,
    string AgeRange,
    string Theme,
    string Difficulty,
    string Color,
    string Accent,
    string? Badge,
    string Description,
    bool IsActive);

public record AnalyticsSummaryDto(
    int TotalOrders,
    int PaidOrders,
    int TotalRevenueCents,
    int RevenueThisMonthCents,
    int OrdersThisMonth,
    List<DailyRevenueDto> Last30Days,
    List<TopProductDto> TopProducts);

public record DailyRevenueDto(string Date, int RevenueCents, int Orders);

public record TopProductDto(string ProductId, string Title, int UnitsSold, int RevenueCents);
