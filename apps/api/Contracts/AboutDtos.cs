using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record AboutSectionDto(Guid Id, string Title, List<string> Body, string Image, string Alt, string Background, int SortIndex)
{
    public static AboutSectionDto From(AboutSection s) =>
        new(s.Id, s.Title, s.Body, s.Image, s.Alt, s.Background, s.SortIndex);
}
