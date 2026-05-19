namespace JovieJoy.Api.Data.Entities;

public class BlogCategory
{
    public string Slug { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Excerpt { get; set; } = null!;
    public string Image { get; set; } = null!;
    public int SortIndex { get; set; }

    public ICollection<Article> Articles { get; set; } = new List<Article>();
}
