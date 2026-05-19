namespace JovieJoy.Api.Data.Entities;

public class GalleryImage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Src { get; set; } = null!;
    public string Alt { get; set; } = null!;
    public int SortIndex { get; set; }
}
