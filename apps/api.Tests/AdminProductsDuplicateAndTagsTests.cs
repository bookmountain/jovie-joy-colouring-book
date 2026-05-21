using System.Linq;
using System.Net.Http.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminProductsDuplicateAndTagsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminProductsDuplicateAndTagsTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Duplicate_creates_draft_with_copy_suffix_and_no_collections()
    {
        var client = await _f.CreateAdminClientAsync();
        var sourceSlug = (await _f.SeedPublishedProducts(1)).Single();
        var res = await client.PostAsync($"/api/admin/products/{sourceSlug}/duplicate", null);
        res.EnsureSuccessStatusCode();
        var dup = await res.Content.ReadFromJsonAsync<ProductDto>();
        Assert.NotNull(dup);
        Assert.Equal($"{sourceSlug}-copy", dup!.Slug);
        Assert.Null(dup.PublishedAt);
        Assert.Empty(dup.Collections);
    }

    [Fact]
    public async Task Duplicate_appends_numeric_suffix_when_copy_slug_already_taken()
    {
        var client = await _f.CreateAdminClientAsync();
        var sourceSlug = (await _f.SeedPublishedProducts(1)).Single();
        var first = await client.PostAsync($"/api/admin/products/{sourceSlug}/duplicate", null);
        first.EnsureSuccessStatusCode();
        var second = await client.PostAsync($"/api/admin/products/{sourceSlug}/duplicate", null);
        second.EnsureSuccessStatusCode();
        var dup2 = await second.Content.ReadFromJsonAsync<ProductDto>();
        Assert.Equal($"{sourceSlug}-copy-2", dup2!.Slug);
    }

    [Fact]
    public async Task Duplicate_returns_404_for_unknown_source()
    {
        var client = await _f.CreateAdminClientAsync();
        var res = await client.PostAsync("/api/admin/products/does-not-exist/duplicate", null);
        Assert.Equal(System.Net.HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Tags_endpoint_returns_distinct_tags_alphabetized()
    {
        var client = await _f.CreateAdminClientAsync();
        await _f.SeedPublishedProducts(1, tags: new[] { "winter", "cozy" });
        await _f.SeedPublishedProducts(1, tags: new[] { "cozy", "holiday" });
        var res = await client.GetAsync("/api/admin/products/tags");
        res.EnsureSuccessStatusCode();
        var tags = await res.Content.ReadFromJsonAsync<string[]>();
        Assert.NotNull(tags);
        Assert.Contains("winter", tags!);
        Assert.Contains("cozy", tags);
        Assert.Contains("holiday", tags);
        Assert.Equal(tags.Distinct().OrderBy(t => t).ToArray(), tags);
    }
}
