namespace JovieJoy.Api.Data.Entities;

public class Freebie
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Excerpt { get; set; } = null!;
    public List<string> Description { get; set; } = new();
    public string CoverImage { get; set; } = "";
    public string FilePath { get; set; } = "";
    public string FileKind { get; set; } = "pdf";
    public long FileSizeBytes { get; set; }
    public int SortIndex { get; set; }
    public bool Published { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<FreebieRequest> Requests { get; set; } = new List<FreebieRequest>();
}
