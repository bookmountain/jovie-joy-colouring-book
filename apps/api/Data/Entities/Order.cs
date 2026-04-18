namespace JovieJoy.Api.Data.Entities;

public enum OrderStatus
{
    Pending = 0,
    Paid = 1,
    Failed = 2,
    Refunded = 3,
}

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    // Guest checkout: we always capture email even if the user isn't registered
    public string Email { get; set; } = null!;
    public string? Name { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public int SubtotalCents { get; set; }
    public int DiscountCents { get; set; }
    public int TotalCents { get; set; }
    public string Currency { get; set; } = "usd";

    public string? PromoCode { get; set; }

    // Stripe linkage
    public string? StripeSessionId { get; set; }
    public string? StripePaymentIntentId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
