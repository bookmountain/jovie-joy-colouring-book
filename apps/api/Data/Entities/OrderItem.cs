namespace JovieJoy.Api.Data.Entities;

public class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;

    // Snapshot fields — preserved if product is deleted later
    public string ProductSlug { get; set; } = null!;
    public string TitleAtPurchase { get; set; } = null!;
    public int UnitPriceCents { get; set; }
    public int Quantity { get; set; }

    // Optional live-FK back to product (nullable so deletes don't cascade)
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
}
