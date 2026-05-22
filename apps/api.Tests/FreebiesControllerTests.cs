using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class FreebiesControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public FreebiesControllerTests(ApiFactory f) => _factory = f;

    [Fact]
    public async Task List_returns_only_published()
    {
        await _factory.SeedFreebie("pub-1", published: true);
        await _factory.SeedFreebie("draft-1", published: false);

        var client = _factory.CreateClient();
        var items = await client.GetFromJsonAsync<List<FreebieListItemDto>>("/api/freebies");

        items.Should().NotBeNull();
        items!.Should().Contain(x => x.Slug == "pub-1");
        items.Should().NotContain(x => x.Slug == "draft-1");
    }

    [Fact]
    public async Task Get_by_slug_returns_published_freebie()
    {
        await _factory.SeedFreebie("getme", published: true);
        var client = _factory.CreateClient();
        var dto = await client.GetFromJsonAsync<FreebieDto>("/api/freebies/getme");
        dto.Should().NotBeNull();
        dto!.Slug.Should().Be("getme");
    }

    [Fact]
    public async Task Get_by_slug_returns_404_when_unpublished()
    {
        await _factory.SeedFreebie("hidden", published: false);
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/freebies/hidden");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Request_creates_row_and_sends_email()
    {
        await _factory.SeedFreebie("req-1");
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/freebies/req-1/request",
            new { email = "a@b.com", optIn = true });
        resp.IsSuccessStatusCode.Should().BeTrue();
        _factory.Emails.Sent.Should().ContainSingle(x => x.To == "a@b.com" && x.Slug == "req-1");
    }

    [Fact]
    public async Task Request_with_optIn_upserts_newsletter_subscriber()
    {
        await _factory.SeedFreebie("req-2");
        var client = _factory.CreateClient();
        await client.PostAsJsonAsync("/api/freebies/req-2/request",
            new { email = "n@b.com", optIn = true });
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.NewsletterSubscribers.AnyAsync(s => s.Email == "n@b.com")).Should().BeTrue();
    }

    [Fact]
    public async Task Request_without_optIn_does_not_subscribe()
    {
        await _factory.SeedFreebie("req-3");
        var client = _factory.CreateClient();
        await client.PostAsJsonAsync("/api/freebies/req-3/request",
            new { email = "noopt@b.com", optIn = false });
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.NewsletterSubscribers.AnyAsync(s => s.Email == "noopt@b.com")).Should().BeFalse();
    }

    [Fact]
    public async Task Request_dedupes_second_submission_for_same_email()
    {
        await _factory.SeedFreebie("req-4");
        var client = _factory.CreateClient();
        await client.PostAsJsonAsync("/api/freebies/req-4/request",
            new { email = "dup@b.com", optIn = true });
        await client.PostAsJsonAsync("/api/freebies/req-4/request",
            new { email = "dup@b.com", optIn = true });

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var rows = await db.FreebieRequests.Where(r => r.Email == "dup@b.com").ToListAsync();
        rows.Should().HaveCount(1);
        _factory.Emails.Sent.Count(x => x.To == "dup@b.com").Should().Be(2);
    }

    [Fact]
    public async Task Request_returns_400_for_invalid_email()
    {
        await _factory.SeedFreebie("req-5");
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/freebies/req-5/request",
            new { email = "not-an-email", optIn = false });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Request_returns_404_for_unpublished_freebie()
    {
        await _factory.SeedFreebie("req-6", published: false);
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/freebies/req-6/request",
            new { email = "a@b.com", optIn = false });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
