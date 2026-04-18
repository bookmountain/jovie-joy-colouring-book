namespace JovieJoy.Api.Data.Entities;

public class Product
{
    public string Id { get; set; } = null!;        // e.g. "p01"
    public string Title { get; set; } = null!;
    public int PriceCents { get; set; }             // store cents, never doubles
    public int Pages { get; set; }
    public string AgeRange { get; set; } = null!;   // "3-5", "5-8", "8-12"
    public string Theme { get; set; } = null!;
    public string Difficulty { get; set; } = null!; // Easy, Medium, Hard
    public string Color { get; set; } = null!;      // hex, drives cover art
    public string Accent { get; set; } = null!;
    public string? Badge { get; set; }              // Bestseller, New, null
    public string Description { get; set; } = null!;
    public string? PdfStorageKey { get; set; }      // where the real PDF lives (s3, local, etc.)
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}
