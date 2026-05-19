using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record GalleryImageDto(Guid Id, string Src, string Alt, int SortIndex)
{
    public static GalleryImageDto From(GalleryImage g) => new(g.Id, g.Src, g.Alt, g.SortIndex);
}
