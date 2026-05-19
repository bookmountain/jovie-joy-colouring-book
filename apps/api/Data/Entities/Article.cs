namespace JovieJoy.Api.Data.Entities;

public class Article
{
    public string Slug { get; set; } = null!;
    public string BlogSlug { get; set; } = null!;
    public BlogCategory Blog { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Excerpt { get; set; } = null!;
    public string Image { get; set; } = null!;
    public List<string> Body { get; set; } = new();    // jsonb
    public int SortIndex { get; set; }
}
