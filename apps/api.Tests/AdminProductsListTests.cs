using System;
using System.Linq;
using System.Net.Http.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminProductsListTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminProductsListTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task List_returns_paged_envelope_with_total_and_status()
    {
        var client = await _f.CreateAdminClientAsync();
        var res = await client.GetAsync("/api/admin/products?page=1&pageSize=2");
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AdminProductListResponse>();
        Assert.NotNull(body);
        Assert.True(body!.Total >= body.Items.Count);
        Assert.True(body.Items.Count <= 2);
        Assert.All(body.Items, p => Assert.False(string.IsNullOrEmpty(p.Status)));
    }

    [Fact]
    public async Task List_with_q_filters_by_title_substring_case_insensitive()
    {
        var client = await _f.CreateAdminClientAsync();
        // Seed a product whose title contains "Cozy"
        await SeedAsync(client, "list-q-test", title: "Cozy List Test Product");
        var res = await client.GetAsync("/api/admin/products?q=cozy");
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AdminProductListResponse>();
        Assert.NotNull(body);
        Assert.True(body!.Items.Count >= 1);
        Assert.All(body.Items, p =>
            Assert.True(
                p.Title.Contains("cozy", StringComparison.OrdinalIgnoreCase)
                || p.Slug.Contains("cozy", StringComparison.OrdinalIgnoreCase)
                || p.Tags.Any(t => string.Equals(t, "cozy", StringComparison.OrdinalIgnoreCase))));
    }

    [Fact]
    public async Task List_with_format_filter_only_returns_matching()
    {
        var client = await _f.CreateAdminClientAsync();
        await SeedAsync(client, "list-fmt-d", productType: "digital");
        var res = await client.GetAsync("/api/admin/products?format=digital");
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AdminProductListResponse>();
        Assert.NotNull(body);
        Assert.True(body!.Items.Count >= 1);
        Assert.All(body.Items, p => Assert.Equal("digital", p.ProductType));
    }

    [Fact]
    public async Task List_sort_price_desc_returns_descending_prices()
    {
        var client = await _f.CreateAdminClientAsync();
        await SeedAsync(client, "list-sort-1", priceCents: 1500);
        await SeedAsync(client, "list-sort-2", priceCents: 999);
        var res = await client.GetAsync("/api/admin/products?sort=price_desc&pageSize=100");
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AdminProductListResponse>();
        var prices = body!.Items.Select(p => p.PriceCents).ToList();
        Assert.Equal(prices.OrderByDescending(p => p).ToList(), prices);
    }

    [Fact]
    public async Task List_with_status_draft_returns_only_drafts()
    {
        var client = await _f.CreateAdminClientAsync();
        await SeedAsync(client, "list-status-draft", publishedAt: null);
        var res = await client.GetAsync("/api/admin/products?status=draft");
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<AdminProductListResponse>();
        Assert.NotNull(body);
        Assert.All(body!.Items, p => Assert.Equal("draft", p.Status));
    }

    private async Task SeedAsync(System.Net.Http.HttpClient client, string slugPrefix,
        string title = "Seed Product", string productType = "physical",
        int priceCents = 100, string? publishedAt = "2026-01-01")
    {
        var slug = $"{slugPrefix}-{Guid.NewGuid():N}";
        var body = new {
            slug, title, excerpt = "ex", description = new[] { "d" },
            priceCents, compareAtPriceCents = (int?)null, available = true,
            productType, images = Array.Empty<string>(),
            options = (object?)null, sourceLinks = (object?)null,
            reviewImages = (string[]?)null, inspirationImages = (string[]?)null,
            tags = Array.Empty<string>(), collectionSlugs = Array.Empty<string>(), publishedAt,
        };
        var res = await client.PostAsJsonAsync("/api/admin/products", body);
        res.EnsureSuccessStatusCode();
    }
}
