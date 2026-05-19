namespace JovieJoy.Api.Data.Entities;

public enum SortKey
{
    Featured, Relevance, BestSelling,
    TitleAscending, TitleDescending,
    PriceAscending, PriceDescending,
    CreatedAscending, CreatedDescending,
}

public enum HomepageSlot { NewRelease, BestSeller, Digital, Tile }

public class Collection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = null!;                 // unique
    public string Title { get; set; } = null!;
    public string Excerpt { get; set; } = null!;
    public string? HeroImage { get; set; }
    public SortKey DefaultSort { get; set; } = SortKey.TitleAscending;
    public HomepageSlot? HomepageSlot { get; set; }
    public List<string> ProductOrder { get; set; } = new();   // jsonb — list of product slugs
    public int SortIndex { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ProductCollection> ProductCollections { get; set; } = new List<ProductCollection>();
}
