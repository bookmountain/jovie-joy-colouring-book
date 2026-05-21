using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

namespace JovieJoy.Api.Tests;

public class ApiFactory : WebApplicationFactory<Program>
{
    private const string JwtSecret = "test-secret-test-secret-test-secret-1234";
    private const string JwtIssuer = "jovie-joy-api";
    private const string JwtAudience = "jovie-joy-web";

    // Each factory instance gets its own isolated in-memory database so that
    // test classes using IClassFixture<ApiFactory> do not share state.
    private readonly string _dbName = $"test-db-{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");
        builder.UseSetting("ConnectionStrings:Default", "Host=ignored;Database=ignored;Username=ignored;Password=ignored");
        builder.UseSetting("Jwt:Secret", JwtSecret);
        builder.UseSetting("Jwt:Issuer", JwtIssuer);
        builder.UseSetting("Jwt:Audience", JwtAudience);
        builder.UseSetting("Stripe:SecretKey", "sk_test_dummy");
        builder.UseSetting("Stripe:WebhookSecret", "whsec_dummy");
        builder.UseSetting("Stripe:SuccessUrl", "http://localhost/success");
        builder.UseSetting("Stripe:CancelUrl", "http://localhost/cancel");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<AppDbContext>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(_dbName));
        });
    }

    /// <summary>
    /// Returns an HttpClient pre-authorised as an admin user via a locally-issued JWT.
    /// No HTTP round-trip to /auth/admin/login is needed — we sign with the same test secret.
    /// </summary>
    public Task<HttpClient> CreateAdminClientAsync()
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Email, "admin@joviejoy.com"),
            new Claim(ClaimTypes.Role, "admin"),
        };
        var jwt = new JwtSecurityToken(
            issuer: JwtIssuer,
            audience: JwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: creds);
        var token = new JwtSecurityTokenHandler().WriteToken(jwt);

        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return Task.FromResult(client);
    }

    public async Task<List<string>> SeedDraftProducts(int count)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var slugs = new List<string>();
        for (var i = 0; i < count; i++)
        {
            var slug = $"bulk-draft-{Guid.NewGuid():N}";
            db.Products.Add(new Product
            {
                Slug = slug,
                Title = $"Bulk draft {i}",
                Excerpt = "ex",
                Description = new List<string> { "d" },
                PriceCents = 100,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>(),
                Options = new List<ProductOption>(),
                Tags = new List<string>(),
                PublishedAt = null,
            });
            slugs.Add(slug);
        }
        await db.SaveChangesAsync();
        return slugs;
    }

    public async Task<List<string>> SeedPublishedProducts(int count, string[]? tags = null)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var slugs = new List<string>();
        for (var i = 0; i < count; i++)
        {
            var slug = $"bulk-pub-{Guid.NewGuid():N}";
            db.Products.Add(new Product
            {
                Slug = slug,
                Title = $"Bulk published {i}",
                Excerpt = "ex",
                Description = new List<string> { "d" },
                PriceCents = 100,
                Available = true,
                ProductType = ProductType.Physical,
                Images = new List<string>(),
                Options = new List<ProductOption>(),
                Tags = (tags ?? Array.Empty<string>()).ToList(),
                PublishedAt = DateTime.UtcNow.AddDays(-1),
            });
            slugs.Add(slug);
        }
        await db.SaveChangesAsync();
        return slugs;
    }

    public async Task<string> SeedCollection()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var slug = $"col-{Guid.NewGuid():N}";
        db.Collections.Add(new Collection
        {
            Slug = slug,
            Title = $"Collection {slug}",
            Excerpt = "",
            DefaultSort = SortKey.Featured,
            HomepageSlot = null,
            ProductOrder = new List<string>(),
            SortIndex = 0,
        });
        await db.SaveChangesAsync();
        return slug;
    }
}
