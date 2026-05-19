using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record StaticPageDto(string Slug, string Title, string Intro, List<string> Blocks)
{
    public static StaticPageDto From(StaticPage p) => new(p.Slug, p.Title, p.Intro, p.Blocks);
}
