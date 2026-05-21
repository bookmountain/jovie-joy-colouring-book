namespace JovieJoy.Api.Data.Entities;

public enum ProductType { Physical, Digital, Sticker, Freebie }

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = null!;            // unique, e.g. "cozy-christmas-coloring-book"
    public string Title { get; set; } = null!;
    public string Excerpt { get; set; } = null!;
    public List<string> Description { get; set; } = new();           // jsonb
    public int PriceCents { get; set; }
    public int? CompareAtPriceCents { get; set; }
    public bool Available { get; set; } = true;
    public ProductType ProductType { get; set; }
    public List<string> Images { get; set; } = new();                // jsonb
    public List<ProductOption> Options { get; set; } = new();        // jsonb
    public List<SourceLink>? SourceLinks { get; set; }               // jsonb
    public List<string>? ReviewImages { get; set; }                  // jsonb
    public List<string>? InspirationImages { get; set; }             // jsonb
    public List<string> Tags { get; set; } = new();                  // jsonb
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? PdfPath { get; set; }                             // retained for digital fulfilment

    public ICollection<ProductCollection> ProductCollections { get; set; } = new List<ProductCollection>();
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}

public record ProductOption(string Name, List<string> Values);
public record SourceLink(string Label, string Href, string? Image, string? Alt);
