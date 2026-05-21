using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/content")]
public class ContentController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<SiteContentBundleDto>> GetBundle(CancellationToken ct)
    {
        var blocks = await db.ContentBlocks.AsNoTracking().OrderBy(b => b.SortIndex).ToListAsync(ct);
        var navRoots = await db.NavLinks.AsNoTracking()
            .Include(n => n.Children).ThenInclude(c => c.Children)
            .Where(n => n.ParentId == null)
            .OrderBy(n => n.SortIndex)
            .ToListAsync(ct);
        var footer = await db.FooterLinks.AsNoTracking().OrderBy(f => f.SortIndex).ToListAsync(ct);
        var social = await db.SocialLinks.AsNoTracking().OrderBy(s => s.SortIndex).ToListAsync(ct);
        var trending = await db.TrendingTerms.AsNoTracking().OrderBy(t => t.SortIndex).Select(t => t.Term).ToListAsync(ct);
        var featuredOnRows = await db.FeaturedOnLinks.AsNoTracking().OrderBy(f => f.SortIndex).ToListAsync(ct);

        var byType = blocks
            .GroupBy(b => b.Type)
            .ToDictionary(g => g.Key, g => g.Select(ContentBlockDto.From).ToList());

        List<ContentBlockDto> grab(ContentBlockType t) =>
            byType.TryGetValue(t, out var list) ? list : new List<ContentBlockDto>();

        var footerGroups = footer
            .GroupBy(f => new { f.GroupKey, f.GroupTitle })
            .Select(g => new FooterLinkGroupDto(g.Key.GroupKey, g.Key.GroupTitle,
                g.OrderBy(x => x.SortIndex).Select(x => new FooterLinkItemDto(x.Label, x.Href)).ToList()))
            .ToList();

        var featuredOnBlocks = featuredOnRows.Select(f => new ContentBlockDto(
            $"featured-on.{f.Slug}",
            ContentBlockType.FeaturedOn.ToString(),
            System.Text.Json.JsonSerializer.SerializeToElement(new
            {
                label = f.Label, href = f.Href, image = f.Image, alt = f.Alt,
            }),
            f.SortIndex,
            DateTime.UtcNow)).ToList();

        return Ok(new SiteContentBundleDto(
            HomeHero: grab(ContentBlockType.HomeHero),
            AboutSections: grab(ContentBlockType.AboutSection),
            Faqs: grab(ContentBlockType.FaqEntry),
            FeaturedOn: featuredOnBlocks,
            HomeVideo: grab(ContentBlockType.HomeVideo),
            FooterGroups: grab(ContentBlockType.FooterGroup),
            Announcement: grab(ContentBlockType.Announcement),
            HeroArtwork: grab(ContentBlockType.HeroArtwork),
            Navigation: navRoots.Select(NavLinkDto.From).ToList(),
            FooterLinks: footerGroups,
            SocialLinks: social.Select(s => new SocialLinkDto(s.Label, s.Href)).ToList(),
            TrendingTerms: trending,
            HomeIntro: grab(ContentBlockType.HomeIntro),
            HomeCozyMomentsHeader: grab(ContentBlockType.HomeCozyMomentsHeader),
            FooterContact: grab(ContentBlockType.FooterContact),
            HeaderBrand: grab(ContentBlockType.HeaderBrand),
            NewsletterCopy: grab(ContentBlockType.NewsletterCopy),
            HomeHeroSlides: grab(ContentBlockType.HomeHeroSlides),
            HomeProductRows: grab(ContentBlockType.HomeProductRow)));
    }
}
