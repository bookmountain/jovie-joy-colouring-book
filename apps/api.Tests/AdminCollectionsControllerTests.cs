using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminCollectionsControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminCollectionsControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"col-{Guid.NewGuid():N}";

        var create = await client.PostAsJsonAsync("/api/admin/collections", new
        {
            slug, title = "Original", excerpt = "ex", heroImage = (string?)null,
            defaultSort = "Featured", homepageSlot = (string?)null,
            productOrder = Array.Empty<string>(), sortIndex = 0,
        });
        create.EnsureSuccessStatusCode();

        var update = await client.PutAsJsonAsync($"/api/admin/collections/{slug}", new
        {
            title = "Renamed", excerpt = "ex2", heroImage = (string?)null,
            defaultSort = "Featured", homepageSlot = (string?)null,
            productOrder = Array.Empty<string>(), sortIndex = 1,
        });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<CollectionDto>();
        Assert.Equal("Renamed", updated!.Title);

        var list = await client.GetFromJsonAsync<CollectionDto[]>("/api/admin/collections");
        Assert.Contains(list!, c => c.Slug == slug && c.Title == "Renamed");

        var del = await client.DeleteAsync($"/api/admin/collections/{slug}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<CollectionDto[]>("/api/admin/collections");
        Assert.DoesNotContain(after!, c => c.Slug == slug);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/admin/collections")).StatusCode);
    }

    [Fact]
    public async Task Assigning_a_product_row_slot_moves_it_from_the_previous_collection()
    {
        var client = await _f.CreateAdminClientAsync();
        var first = $"slot-first-{Guid.NewGuid():N}";
        var second = $"slot-second-{Guid.NewGuid():N}";

        await CreateCollection(client, first, "newrelease");
        await CreateCollection(client, second, "newrelease");

        var rows = await client.GetFromJsonAsync<CollectionDto[]>("/api/admin/collections");
        Assert.Null(Assert.Single(rows!, collection => collection.Slug == first).HomepageSlot);
        Assert.Equal("newrelease", Assert.Single(rows!, collection => collection.Slug == second).HomepageSlot);
    }

    [Fact]
    public async Task Tile_slot_allows_multiple_collections()
    {
        var client = await _f.CreateAdminClientAsync();
        var first = $"tile-first-{Guid.NewGuid():N}";
        var second = $"tile-second-{Guid.NewGuid():N}";

        await CreateCollection(client, first, "tile");
        await CreateCollection(client, second, "tile");

        var rows = await client.GetFromJsonAsync<CollectionDto[]>("/api/admin/collections");
        Assert.Equal("tile", Assert.Single(rows!, collection => collection.Slug == first).HomepageSlot);
        Assert.Equal("tile", Assert.Single(rows!, collection => collection.Slug == second).HomepageSlot);
    }

    [Fact]
    public async Task Invalid_hero_replacement_preserves_the_existing_reference_and_file()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"hero-replacement-{Guid.NewGuid():N}";
        var existingUrl = $"/uploads/collections/{slug}-existing.png";
        var existingPath = Path.Combine(
            _f.ContentRoot,
            existingUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(existingPath)!);
        await File.WriteAllBytesAsync(existingPath, [1, 2, 3, 4]);

        var create = await client.PostAsJsonAsync("/api/admin/collections", new
        {
            slug,
            title = "Hero replacement",
            excerpt = "",
            heroImage = existingUrl,
            defaultSort = "Featured",
            homepageSlot = (string?)null,
            productOrder = Array.Empty<string>(),
            sortIndex = 999,
        });
        create.EnsureSuccessStatusCode();

        using var form = new MultipartFormDataContent();
        using var bytes = new ByteArrayContent([1, 2, 3, 4]);
        bytes.Headers.ContentType = new("image/png");
        form.Add(bytes, "file", "replacement.png");

        var replace = await client.PostAsync($"/api/admin/collections/{slug}/hero-image", form);

        Assert.Equal(HttpStatusCode.BadRequest, replace.StatusCode);
        Assert.True(File.Exists(existingPath));
        var unchanged = await client.GetFromJsonAsync<CollectionDto>($"/api/admin/collections/{slug}");
        Assert.Equal(existingUrl, unchanged!.HeroImage);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/admin/collections/{slug}")).StatusCode);
        Assert.False(File.Exists(existingPath));
    }

    private static async Task CreateCollection(HttpClient client, string slug, string homepageSlot)
    {
        var response = await client.PostAsJsonAsync("/api/admin/collections", new
        {
            slug,
            title = slug,
            excerpt = "slot test",
            heroImage = (string?)null,
            defaultSort = "Featured",
            homepageSlot,
            productOrder = Array.Empty<string>(),
            sortIndex = 999,
        });
        response.EnsureSuccessStatusCode();
    }
}
