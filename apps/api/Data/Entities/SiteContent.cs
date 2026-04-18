namespace JovieJoy.Api.Data.Entities;

public class SiteContent
{
    public string Key { get; set; } = null!;    // e.g. "home.hero.badge", "about.headline"
    public string Value { get; set; } = null!;
    public string Type { get; set; } = "text";  // "text" | "image"
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
