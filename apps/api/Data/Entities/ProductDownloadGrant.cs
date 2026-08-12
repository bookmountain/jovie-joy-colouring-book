namespace JovieJoy.Api.Data.Entities;

/// <summary>
/// Opaque, expiring entitlement created only after Stripe confirms payment for a
/// digital order item. The token is the capability; product file paths are never
/// exposed through the public catalog API.
/// </summary>
public sealed class ProductDownloadGrant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public Guid OrderItemId { get; set; }
    public OrderItem OrderItem { get; set; } = null!;
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
    public string FilePath { get; set; } = null!;
    public string ProductSlug { get; set; } = null!;
    public string TitleAtPurchase { get; set; } = null!;
    public string Token { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public int DownloadCount { get; set; }
    public DateTime? FirstDownloadedAt { get; set; }
    public DateTime? LastDownloadedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
