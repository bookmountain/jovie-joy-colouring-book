namespace JovieJoy.Api.Data.Entities;

public class FooterLink
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string GroupKey { get; set; } = null!;     // e.g. "info", "our-book"
    public string GroupTitle { get; set; } = null!;   // denormalized for simplicity
    public string Label { get; set; } = null!;
    public string Href { get; set; } = null!;
    public int SortIndex { get; set; }
}
