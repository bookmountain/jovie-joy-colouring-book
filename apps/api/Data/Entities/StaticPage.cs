namespace JovieJoy.Api.Data.Entities;

public class StaticPage
{
    public string Slug { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Intro { get; set; } = null!;
    public List<string> Blocks { get; set; } = new();       // jsonb
}
