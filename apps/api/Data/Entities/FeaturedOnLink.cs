namespace JovieJoy.Api.Data.Entities;

public class FeaturedOnLink
{
    public string Slug { get; set; } = null!;          // PK; e.g. "penguin", "etsy"
    public string Label { get; set; } = null!;
    public string Href { get; set; } = null!;
    public string Image { get; set; } = null!;
    public string Alt { get; set; } = null!;
    public int SortIndex { get; set; }
}
