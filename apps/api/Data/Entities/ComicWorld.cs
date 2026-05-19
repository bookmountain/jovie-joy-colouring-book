namespace JovieJoy.Api.Data.Entities;

public class ComicWorld
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = null!;
    public int SortIndex { get; set; }

    public ICollection<Comic> Comics { get; set; } = new List<Comic>();
}
