namespace JovieJoy.Api.Data.Entities;

public class AboutSection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = null!;
    public List<string> Body { get; set; } = new();         // jsonb
    public string Image { get; set; } = null!;
    public string Alt { get; set; } = null!;
    public string Background { get; set; } = null!;         // hex
    public int SortIndex { get; set; }
}
