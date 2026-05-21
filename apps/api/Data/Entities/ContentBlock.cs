using System.Text.Json;

namespace JovieJoy.Api.Data.Entities;

public enum ContentBlockType
{
    HomeHero,
    AboutSection,
    FaqEntry,
    FooterGroup,
    FeaturedOn,
    HomeVideo,
    Announcement,
    HeroArtwork,
    HomeIntro,
    HomeCozyMomentsHeader,
    FooterContact,
    HeaderBrand,
    NewsletterCopy,
    HomeHeroSlides,
}

public class ContentBlock
{
    public string Key { get; set; } = null!;            // e.g. "home.hero", "footer.group.info"
    public ContentBlockType Type { get; set; }
    public JsonDocument Data { get; set; } = null!;     // jsonb; shape varies per type
    public int SortIndex { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
