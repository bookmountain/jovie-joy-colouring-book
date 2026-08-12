using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class ContentControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public ContentControllerTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Bundle_returns_navigation_tree_and_footer_groups()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            if (!await db.NavLinks.AnyAsync())
            {
                var home = new NavLink { Label = "Home", Href = "/", SortIndex = 0 };
                db.NavLinks.Add(home);
                db.FooterLinks.Add(new FooterLink { GroupKey = "info", GroupTitle = "Info", Label = "About", Href = "/about", SortIndex = 0 });
                await db.SaveChangesAsync();
            }
        }

        var client = _factory.CreateClient();
        var bundle = await client.GetFromJsonAsync<SiteContentBundleDto>("/api/content");
        bundle.Should().NotBeNull();
        bundle!.Navigation.Should().NotBeEmpty();
        bundle.FooterLinks.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Bundle_excludes_retired_generic_content_blocks()
    {
        var retiredKey = $"retired-faq-{Guid.NewGuid():N}";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.ContentBlocks.Add(new ContentBlock
            {
                Key = retiredKey,
                Type = ContentBlockType.FaqEntry,
                Data = JsonDocument.Parse("""{"question":"Stale question","answer":"Stale answer"}"""),
                SortIndex = 999,
            });
            db.ContentBlocks.Add(new ContentBlock
            {
                Key = $"active-video-{Guid.NewGuid():N}",
                Type = ContentBlockType.HomeVideo,
                Data = JsonDocument.Parse("""{"src":"/video.mp4","youtubeHref":""}"""),
                SortIndex = 999,
            });
            await db.SaveChangesAsync();
        }

        var bundle = await _factory.CreateClient().GetFromJsonAsync<SiteContentBundleDto>("/api/content");

        bundle.Should().NotBeNull();
        bundle!.Faqs.Should().BeEmpty();
        bundle.HomeHero.Should().BeEmpty();
        bundle.AboutSections.Should().BeEmpty();
        bundle.FooterGroups.Should().BeEmpty();
        bundle.HomeVideo.Should().NotBeEmpty();
    }
}
