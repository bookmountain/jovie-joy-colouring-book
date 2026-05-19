namespace JovieJoy.Api.Data.Entities;

public class SocialLink
{
    public string Label { get; set; } = null!;        // PK; e.g. "Facebook"
    public string Href { get; set; } = null!;
    public int SortIndex { get; set; }
}
