using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record FaqLinkDto(string Label, string Href);

public record FaqDto(string Slug, string Question, string Answer, List<FaqLinkDto>? Links, string? Group, int SortIndex)
{
    public static FaqDto From(Faq f) => new(
        f.Slug, f.Question, f.Answer,
        f.Links?.Select(l => new FaqLinkDto(l.Label, l.Href)).ToList(),
        f.Group, f.SortIndex);
}
