using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class AdminChromeControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public AdminChromeControllerTests(ApiFactory f) => _factory = f;

    [Fact]
    public async Task AdminStaticPages_List_Requires_Admin()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/admin/static-pages");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AdminFooterLinks_List_Requires_Admin()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/admin/footer-links");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AdminSocialLinks_List_Requires_Admin()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/admin/social-links");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task StaticPage_Entity_Roundtrips_Through_DbContext()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();
        if (await db.StaticPages.AnyAsync(p => p.Slug == "test-page"))
            db.StaticPages.RemoveRange(db.StaticPages.Where(p => p.Slug == "test-page"));
        await db.SaveChangesAsync();

        db.StaticPages.Add(new StaticPage
        {
            Slug = "test-page",
            Title = "Test",
            Intro = "Hi",
            Blocks = new() { "para 1", "para 2" },
        });
        await db.SaveChangesAsync();

        var saved = await db.StaticPages.AsNoTracking().FirstAsync(p => p.Slug == "test-page");
        saved.Title.Should().Be("Test");
        saved.Blocks.Should().HaveCount(2);
    }
}
