namespace JovieJoy.Api.Contracts;

public record CartLineRequest(string ProductSlug, int Quantity);

public record CheckoutRequest(
    string Email,
    string? Name,
    List<CartLineRequest> Items,
    string? PromoCode);

public record CheckoutResponse(string CheckoutUrl, Guid OrderId);
