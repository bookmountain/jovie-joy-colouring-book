using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class ProductsControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public ProductsControllerTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Get_by_slug_returns_404_when_missing()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/products/nonexistent");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task List_returns_seeded_product()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            if (!await db.Products.AnyAsync())
            {
                db.Products.Add(new Product
                {
                    Slug = "test-seed", Title = "Test Seed", Excerpt = "x",
                    Description = new List<string> { "y" }, PriceCents = 100,
                    ProductType = ProductType.Digital, PublishedAt = DateTime.UtcNow,
                });
                await db.SaveChangesAsync();
            }
        }

        var client = _factory.CreateClient();
        var products = await client.GetFromJsonAsync<List<ProductDto>>("/api/products");
        products.Should().NotBeNull();
        products!.Should().ContainSingle(p => p.Slug == "test-seed");
    }
}
