namespace JovieJoy.Api.Data.Entities;

public class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public string ProductId { get; set; } = null!;
    public Product Product { get; set; } = null!;

    // Snapshot fields — product data at purchase time (prices change)
    public string TitleAtPurchase { get; set; } = null!;
    public int UnitPriceCents { get; set; }
    public int Quantity { get; set; }
}
