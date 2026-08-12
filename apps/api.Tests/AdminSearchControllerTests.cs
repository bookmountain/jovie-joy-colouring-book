using System.Net;
using System.Net.Http.Json;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class AdminSearchControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AdminSearchControllerTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Search_returns_bounded_products_orders_customers_and_cms_routes()
    {
        var marker = Guid.NewGuid().ToString("N")[..10];
        var email = $"moon-{marker}@example.com";
        var orderId = Guid.NewGuid();
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Products.Add(new Product
            {
                Slug = $"moon-{marker}", Title = $"Moon {marker}", Excerpt = "",
                Description = [], PriceCents = 100, Available = true,
                ProductType = ProductType.Physical, Images = [], Options = [], Tags = [],
            });
            db.Users.Add(new User { Email = email, Name = $"Moon {marker}" });
            db.Orders.Add(new Order
            {
                Id = orderId, Email = email, Name = $"Moon {marker}", Status = OrderStatus.Paid,
                SubtotalCents = 1_234, TotalCents = 1_234, Currency = "usd",
            });
            await db.SaveChangesAsync();
        }

        var admin = await _factory.CreateAdminClientAsync();
        var response = await admin.GetFromJsonAsync<AdminSearchResponse>($"/api/admin/search?q={marker}&limit=20");

        Assert.NotNull(response);
        Assert.Contains(response!.Items, item => item.Type == "product" && item.Href.Contains($"moon-{marker}"));
        var order = Assert.Single(response.Items, item => item.Type == "order" && item.Id == orderId.ToString());
        Assert.Contains("$12.34", order.Subtitle);
        Assert.DoesNotContain("$$", order.Subtitle);
        Assert.Contains(response.Items, item => item.Type == "customer" && item.Id == email);

        var cms = await admin.GetFromJsonAsync<AdminSearchResponse>("/api/admin/search?q=navigation&limit=2");
        Assert.Contains(cms!.Items, item => item.Href == "/admin/navigation");
        Assert.True(cms.Items.Count <= 2);
    }

    [Fact]
    public async Task Search_validates_query_and_requires_admin()
    {
        var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/admin/search?q=product")).StatusCode);

        var admin = await _factory.CreateAdminClientAsync();
        var shortQuery = await admin.GetFromJsonAsync<AdminSearchResponse>("/api/admin/search?q=x");
        Assert.Empty(shortQuery!.Items);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync($"/api/admin/search?q={new string('a', 101)}")).StatusCode);
    }

    [Fact]
    public async Task Frequent_guest_orders_do_not_crowd_other_matching_customers_out_of_search()
    {
        var marker = $"guest-crowd-{Guid.NewGuid():N}";
        var frequentEmail = $"{marker}-frequent@example.com";
        var otherEmail = $"{marker}-other@example.com";
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            for (var index = 0; index < 65; index++)
            {
                db.Orders.Add(new Order
                {
                    Email = frequentEmail,
                    Name = frequentEmail,
                    Status = OrderStatus.Paid,
                    TotalCents = 100,
                    Currency = "usd",
                    CreatedAt = DateTime.UtcNow.AddMinutes(index),
                });
            }
            db.Orders.Add(new Order
            {
                Email = otherEmail,
                Name = otherEmail,
                Status = OrderStatus.Paid,
                TotalCents = 100,
                Currency = "usd",
                CreatedAt = DateTime.UtcNow.AddDays(-1),
            });
            await db.SaveChangesAsync();
        }

        var admin = await _factory.CreateAdminClientAsync();
        var response = await admin.GetFromJsonAsync<AdminSearchResponse>(
            $"/api/admin/search?q={Uri.EscapeDataString(marker)}&limit=20");

        Assert.Contains(response!.Items, item => item.Type == "customer" && item.Id == frequentEmail);
        Assert.Contains(response.Items, item => item.Type == "customer" && item.Id == otherEmail);
    }
}
