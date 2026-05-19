namespace JovieJoy.Api.Data.Entities;

public class Faq
{
    public string Slug { get; set; } = null!;          // PK; derived from question
    public string Question { get; set; } = null!;
    public string Answer { get; set; } = null!;
    public List<FaqLink>? Links { get; set; }          // jsonb
    public string? Group { get; set; }
    public int SortIndex { get; set; }
}

public record FaqLink(string Label, string Href);
