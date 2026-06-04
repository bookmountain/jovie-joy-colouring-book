using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminProductsOptionsBehaviourTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminProductsOptionsBehaviourTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Create_without_options_inserts_default_single_format()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"opts-create-{Guid.NewGuid():N}";
        var body = new
        {
            slug,
            title = "T",
            excerpt = "E",
            description = new[] { "d" },
            priceCents = 100,
            compareAtPriceCents = (int?)null,
            available = true,
            productType = "physical",
            images = Array.Empty<string>(),
            options = (object?)null,
            sourceLinks = (object?)null,
            reviewImages = (string[]?)null,
            inspirationImages = (string[]?)null,
            tags = Array.Empty<string>(),
            collectionSlugs = Array.Empty<string>(),
            publishedAt = (string?)null,
        };

        var res = await client.PostAsJsonAsync("/api/admin/products", body);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var dto = await res.Content.ReadFromJsonAsync<ProductDto>();
        Assert.NotNull(dto);
        Assert.Single(dto!.Options);
        Assert.Equal("Format", dto.Options[0].Name);
        Assert.Single(dto.Options[0].Values);
        Assert.Equal("Default Title", dto.Options[0].Values[0]);
    }

    [Fact]
    public async Task Update_without_options_preserves_existing_options()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"opts-update-{Guid.NewGuid():N}";

        // Seed with a richer options value.
        var seedBody = new
        {
            slug,
            title = "T",
            excerpt = "E",
            description = new[] { "d" },
            priceCents = 100,
            compareAtPriceCents = (int?)null,
            available = true,
            productType = "physical",
            images = Array.Empty<string>(),
            options = new[] { new { name = "Size", values = new[] { "A4", "A5" } } },
            sourceLinks = (object?)null,
            reviewImages = (string[]?)null,
            inspirationImages = (string[]?)null,
            tags = Array.Empty<string>(),
            collectionSlugs = Array.Empty<string>(),
            publishedAt = (string?)null,
        };
        var seed = await client.PostAsJsonAsync("/api/admin/products", seedBody);
        seed.EnsureSuccessStatusCode();

        // Update without sending options.
        var updateBody = new
        {
            title = "T2",
            excerpt = "E",
            description = new[] { "d" },
            priceCents = 200,
            compareAtPriceCents = (int?)null,
            available = true,
            productType = "physical",
            images = Array.Empty<string>(),
            options = (object?)null,
            sourceLinks = (object?)null,
            reviewImages = (string[]?)null,
            inspirationImages = (string[]?)null,
            tags = Array.Empty<string>(),
            collectionSlugs = Array.Empty<string>(),
            publishedAt = (string?)null,
        };
        var res = await client.PutAsJsonAsync($"/api/admin/products/{slug}", updateBody);
        res.EnsureSuccessStatusCode();
        var dto = await res.Content.ReadFromJsonAsync<ProductDto>();
        Assert.NotNull(dto);
        Assert.Single(dto!.Options);
        Assert.Equal("Size", dto.Options[0].Name);
        Assert.Equal(new[] { "A4", "A5" }, dto.Options[0].Values);
    }

    [Fact]
    public async Task Update_with_empty_options_array_preserves_existing()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"opts-empty-{Guid.NewGuid():N}";

        var seedBody = new
        {
            slug,
            title = "T",
            excerpt = "E",
            description = new[] { "d" },
            priceCents = 100,
            compareAtPriceCents = (int?)null,
            available = true,
            productType = "physical",
            images = Array.Empty<string>(),
            options = new[] { new { name = "Binding", values = new[] { "Spiral" } } },
            sourceLinks = (object?)null,
            reviewImages = (string[]?)null,
            inspirationImages = (string[]?)null,
            tags = Array.Empty<string>(),
            collectionSlugs = Array.Empty<string>(),
            publishedAt = (string?)null,
        };
        var seed = await client.PostAsJsonAsync("/api/admin/products", seedBody);
        seed.EnsureSuccessStatusCode();

        var updateBody = new
        {
            title = "T",
            excerpt = "E",
            description = new[] { "d" },
            priceCents = 100,
            compareAtPriceCents = (int?)null,
            available = true,
            productType = "physical",
            images = Array.Empty<string>(),
            options = Array.Empty<object>(),
            sourceLinks = (object?)null,
            reviewImages = (string[]?)null,
            inspirationImages = (string[]?)null,
            tags = Array.Empty<string>(),
            collectionSlugs = Array.Empty<string>(),
            publishedAt = (string?)null,
        };
        var res = await client.PutAsJsonAsync($"/api/admin/products/{slug}", updateBody);
        res.EnsureSuccessStatusCode();
        var dto = await res.Content.ReadFromJsonAsync<ProductDto>();
        Assert.Single(dto!.Options);
        Assert.Equal("Binding", dto.Options[0].Name);
    }

    [Fact]
    public async Task Update_persists_published_at_from_detail_form()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"publish-detail-{Guid.NewGuid():N}";

        var seedBody = new
        {
            slug,
            title = "Draft product",
            excerpt = "E",
            description = new[] { "d" },
            priceCents = 100,
            compareAtPriceCents = (int?)null,
            available = true,
            productType = "physical",
            images = Array.Empty<string>(),
            options = (object?)null,
            sourceLinks = (object?)null,
            reviewImages = (string[]?)null,
            inspirationImages = (string[]?)null,
            tags = Array.Empty<string>(),
            collectionSlugs = Array.Empty<string>(),
            publishedAt = (string?)null,
        };
        var seed = await client.PostAsJsonAsync("/api/admin/products", seedBody);
        seed.EnsureSuccessStatusCode();

        var publishDate = "2026-06-04";
        var updateBody = new
        {
            title = "Published product",
            excerpt = "E",
            description = new[] { "d" },
            priceCents = 100,
            compareAtPriceCents = (int?)null,
            available = true,
            productType = "physical",
            images = Array.Empty<string>(),
            options = (object?)null,
            sourceLinks = (object?)null,
            reviewImages = (string[]?)null,
            inspirationImages = (string[]?)null,
            tags = Array.Empty<string>(),
            collectionSlugs = Array.Empty<string>(),
            publishedAt = publishDate,
        };

        var res = await client.PutAsJsonAsync($"/api/admin/products/{slug}", updateBody);
        res.EnsureSuccessStatusCode();
        var dto = await res.Content.ReadFromJsonAsync<ProductDto>();

        Assert.NotNull(dto);
        Assert.NotNull(dto!.PublishedAt);
        Assert.Equal(DateTime.SpecifyKind(DateTime.Parse(publishDate), DateTimeKind.Utc), dto.PublishedAt);
    }
}
