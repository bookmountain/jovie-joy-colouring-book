using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record ComicImageDto(string Src, string Alt);
public record ComicDto(Guid Id, string Title, string Description, bool HasDownload, List<ComicImageDto> Images, int SortIndex)
{
    public static ComicDto From(Comic c) => new(
        c.Id, c.Title, c.Description, c.HasDownload,
        c.Images.Select(i => new ComicImageDto(i.Src, i.Alt)).ToList(),
        c.SortIndex);
}

public record ComicWorldDto(Guid Id, string Title, List<ComicDto> Comics, int SortIndex)
{
    public static ComicWorldDto From(ComicWorld w) => new(
        w.Id, w.Title,
        w.Comics.OrderBy(c => c.SortIndex).Select(ComicDto.From).ToList(),
        w.SortIndex);
}
