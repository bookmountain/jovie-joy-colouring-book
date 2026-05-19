namespace JovieJoy.Api.Data.Entities;

public class Comic
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorldId { get; set; }
    public ComicWorld World { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public bool HasDownload { get; set; }
    public List<ComicImage> Images { get; set; } = new();   // jsonb
    public int SortIndex { get; set; }
}

public record ComicImage(string Src, string Alt);
