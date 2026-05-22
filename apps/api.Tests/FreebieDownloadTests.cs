using System.Net;
using FluentAssertions;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class FreebieDownloadTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public FreebieDownloadTests(ApiFactory f) => _factory = f;

    private async Task<(string token, string filePath)> SeedRequest(
        string slug, DateTime expiresAt, bool published = true)
    {
        using var scope = _factory.Services.CreateScope();
        var hostEnv = scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>();
        var dir = Path.Combine(hostEnv.ContentRootPath, "uploads", "freebies", "files");
        Directory.CreateDirectory(dir);
        var fileName = $"{Guid.NewGuid():N}.pdf";
        var abs = Path.Combine(dir, fileName);
        await File.WriteAllBytesAsync(abs, new byte[] { 1, 2, 3, 4 });
        var rel = $"/uploads/freebies/files/{fileName}";

        var freebieId = await _factory.SeedFreebie(slug, published: published, filePath: rel);

        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var token = $"tok-{Guid.NewGuid():N}";
        db.FreebieRequests.Add(new FreebieRequest
        {
            FreebieId = freebieId, Email = "x@y.com", Token = token,
            ExpiresAt = expiresAt, OptedIntoNewsletter = false,
        });
        await db.SaveChangesAsync();
        return (token, abs);
    }

    [Fact]
    public async Task Valid_token_streams_file_and_increments_count()
    {
        var (token, _) = await SeedRequest("dl-1", DateTime.UtcNow.AddDays(1));
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/freebies/download/{token}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        resp.Content.Headers.ContentDisposition!.DispositionType.Should().Be("attachment");
        (await resp.Content.ReadAsByteArrayAsync()).Should().HaveCount(4);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await db.FreebieRequests.FirstAsync(r => r.Token == token);
        row.DownloadCount.Should().Be(1);
        row.FirstDownloadedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Expired_token_redirects_to_expired_banner()
    {
        var (token, _) = await SeedRequest("dl-2", DateTime.UtcNow.AddDays(-1));
        var client = _factory.CreateClient(new() { AllowAutoRedirect = false });
        var resp = await client.GetAsync($"/api/freebies/download/{token}");
        resp.StatusCode.Should().BeOneOf(HttpStatusCode.Redirect, HttpStatusCode.Found, HttpStatusCode.SeeOther);
        resp.Headers.Location!.ToString().Should().Contain("download=expired");
    }

    [Fact]
    public async Task Unknown_token_redirects_to_invalid_banner()
    {
        var client = _factory.CreateClient(new() { AllowAutoRedirect = false });
        var resp = await client.GetAsync("/api/freebies/download/does-not-exist");
        resp.Headers.Location!.ToString().Should().Contain("download=invalid");
    }

    [Fact]
    public async Task Unpublished_freebie_treats_as_expired()
    {
        var (token, _) = await SeedRequest("dl-3", DateTime.UtcNow.AddDays(1), published: false);
        var client = _factory.CreateClient(new() { AllowAutoRedirect = false });
        var resp = await client.GetAsync($"/api/freebies/download/{token}");
        resp.Headers.Location!.ToString().Should().Contain("download=expired");
    }

    [Fact]
    public async Task Traversal_attempt_redirects_to_expired()
    {
        using var scope = _factory.Services.CreateScope();
        var hostEnv = scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>();
        // Place a real file OUTSIDE the uploads root so File.Exists would otherwise succeed.
        var sentinelPath = Path.Combine(hostEnv.ContentRootPath, "freebie-traversal-sentinel.txt");
        await File.WriteAllTextAsync(sentinelPath, "should not be served");
        try
        {
            var freebieId = await _factory.SeedFreebie("dl-trav", filePath: "/../freebie-traversal-sentinel.txt");
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var token = $"tok-trav-{Guid.NewGuid():N}";
            db.FreebieRequests.Add(new FreebieRequest
            {
                FreebieId = freebieId, Email = "x@y.com", Token = token,
                ExpiresAt = DateTime.UtcNow.AddDays(1), OptedIntoNewsletter = false,
            });
            await db.SaveChangesAsync();

            var client = _factory.CreateClient(new() { AllowAutoRedirect = false });
            var resp = await client.GetAsync($"/api/freebies/download/{token}");
            resp.Headers.Location!.ToString().Should().Contain("download=expired");
        }
        finally { if (File.Exists(sentinelPath)) File.Delete(sentinelPath); }
    }
}
