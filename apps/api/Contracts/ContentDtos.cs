using System.Text.Json;
using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record ContentBlockDto(string Key, string Type, JsonElement Data, int SortIndex, DateTime UpdatedAt)
{
    public static ContentBlockDto From(ContentBlock c) =>
        new(c.Key, c.Type.ToString(), c.Data.RootElement.Clone(), c.SortIndex, c.UpdatedAt);
}

public record SiteContentBundleDto(
    List<ContentBlockDto> HomeHero,
    List<ContentBlockDto> AboutSections,
    List<ContentBlockDto> Faqs,
    List<ContentBlockDto> FeaturedOn,
    List<ContentBlockDto> HomeVideo,
    List<ContentBlockDto> FooterGroups,
    List<ContentBlockDto> Announcement,
    List<ContentBlockDto> HeroArtwork,
    List<NavLinkDto> Navigation,
    List<FooterLinkGroupDto> FooterLinks,
    List<SocialLinkDto> SocialLinks,
    List<string> TrendingTerms,
    List<ContentBlockDto> HomeIntro,
    List<ContentBlockDto> HomeCozyMomentsHeader,
    List<ContentBlockDto> FooterContact,
    List<ContentBlockDto> HeaderBrand,
    List<ContentBlockDto> NewsletterCopy);

public record NavLinkDto(Guid Id, string Label, string Href, List<NavLinkDto> Children)
{
    public static NavLinkDto From(NavLink n) => new(
        n.Id, n.Label, n.Href,
        n.Children.OrderBy(c => c.SortIndex).Select(From).ToList());
}

public record FooterLinkGroupDto(string Key, string Title, List<FooterLinkItemDto> Links);
public record FooterLinkItemDto(string Label, string Href);
public record SocialLinkDto(string Label, string Href);
