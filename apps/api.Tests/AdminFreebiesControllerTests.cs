using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class AdminFreebiesControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public AdminFreebiesControllerTests(ApiFactory f) => _factory = f;

    [Fact]
    public async Task List_requires_admin()
    {
        var anon = _factory.CreateClient();
        var resp = await anon.GetAsync("/api/admin/freebies");
        resp.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task List_returns_published_and_drafts()
    {
        await _factory.SeedFreebie("adm-pub", published: true);
        await _factory.SeedFreebie("adm-draft", published: false);
        var admin = await _factory.CreateAdminClientAsync();
        var items = await admin.GetFromJsonAsync<List<FreebieAdminDto>>("/api/admin/freebies");
        items!.Select(x => x.Slug).Should().Contain(new[] { "adm-pub", "adm-draft" });
    }

    [Fact]
    public async Task Create_inserts_draft()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var resp = await admin.PostAsJsonAsync("/api/admin/freebies",
            new { slug = "new-f", title = "New F", excerpt = "Short", description = new[] { "p1" }, published = false });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Freebies.AnyAsync(f => f.Slug == "new-f")).Should().BeTrue();
    }

    [Fact]
    public async Task Update_writes_changes()
    {
        await _factory.SeedFreebie("upd-1", published: true);
        var admin = await _factory.CreateAdminClientAsync();
        var resp = await admin.PutAsJsonAsync("/api/admin/freebies/upd-1",
            new { title = "Edited", excerpt = "New excerpt", description = new[] { "edited" }, published = false });
        resp.IsSuccessStatusCode.Should().BeTrue();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await db.Freebies.FirstAsync(f => f.Slug == "upd-1");
        row.Title.Should().Be("Edited");
        row.Published.Should().BeFalse();
    }

    [Fact]
    public async Task Delete_removes_freebie_and_requests()
    {
        var fid = await _factory.SeedFreebie("del-1");
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.FreebieRequests.Add(new Data.Entities.FreebieRequest
            {
                FreebieId = fid, Email = "x@y.com", Token = "t-del", ExpiresAt = DateTime.UtcNow.AddDays(1),
            });
            await db.SaveChangesAsync();
        }
        var admin = await _factory.CreateAdminClientAsync();
        var resp = await admin.DeleteAsync("/api/admin/freebies/del-1");
        resp.IsSuccessStatusCode.Should().BeTrue();
        using var s2 = _factory.Services.CreateScope();
        var db2 = s2.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db2.Freebies.AnyAsync(f => f.Slug == "del-1")).Should().BeFalse();
        (await db2.FreebieRequests.AnyAsync(r => r.Token == "t-del")).Should().BeFalse();
    }

    [Fact]
    public async Task Reorder_updates_sort_index()
    {
        await _factory.SeedFreebie("ord-a");
        await _factory.SeedFreebie("ord-b");
        var admin = await _factory.CreateAdminClientAsync();
        var resp = await admin.PostAsJsonAsync("/api/admin/freebies/reorder",
            new[] {
                new { slug = "ord-b", sortIndex = 0 },
                new { slug = "ord-a", sortIndex = 1 },
            });
        resp.IsSuccessStatusCode.Should().BeTrue();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Freebies.FirstAsync(f => f.Slug == "ord-b")).SortIndex.Should().Be(0);
        (await db.Freebies.FirstAsync(f => f.Slug == "ord-a")).SortIndex.Should().Be(1);
    }
}
