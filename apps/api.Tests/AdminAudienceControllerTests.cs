using System.Net;
using System.Net.Http.Json;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class AdminAudienceControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AdminAudienceControllerTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Customers_merges_accounts_and_guest_orders_with_paid_lifetime_value()
    {
        var marker = Guid.NewGuid().ToString("N");
        var accountEmail = $"ada-{marker}@example.com";
        var guestEmail = $"guest-{marker}@example.com";
        var adminEmail = $"staff-{marker}@example.com";
        var joinedAt = new DateTime(2026, 1, 2, 3, 0, 0, DateTimeKind.Utc);
        var lastOrderAt = joinedAt.AddDays(3);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Users.AddRange(
                new User { Email = accountEmail, Name = "Ada Artist", CreatedAt = joinedAt },
                new User { Email = adminEmail, Name = "Staff", IsAdmin = true, CreatedAt = joinedAt });
            db.Orders.AddRange(
                new Order
                {
                    Email = accountEmail.ToUpperInvariant(), Name = "Checkout name",
                    Status = OrderStatus.Paid, TotalCents = 2_500, CreatedAt = joinedAt.AddDays(1),
                },
                new Order
                {
                    Email = accountEmail, Name = "Checkout name",
                    Status = OrderStatus.Pending, TotalCents = 9_999, CreatedAt = lastOrderAt,
                },
                new Order
                {
                    Email = guestEmail, Name = "Guest Buyer",
                    Status = OrderStatus.Paid, TotalCents = 1_200, CreatedAt = joinedAt.AddDays(2),
                },
                new Order
                {
                    Email = adminEmail, Name = "Staff",
                    Status = OrderStatus.Paid, TotalCents = 50_000, CreatedAt = joinedAt.AddDays(4),
                });
            await db.SaveChangesAsync();
        }

        var client = await _factory.CreateAdminClientAsync();
        var response = await client.GetFromJsonAsync<AdminPagedResponse<AdminCustomerListItem>>(
            $"/api/admin/customers?q={marker}&page=1&pageSize=25");

        Assert.NotNull(response);
        Assert.Equal(2, response!.Total);
        var account = Assert.Single(response.Items, item =>
            item.Email.Equals(accountEmail, StringComparison.OrdinalIgnoreCase));
        Assert.Equal("Ada Artist", account.Name);
        Assert.True(account.Registered);
        Assert.Equal(2, account.OrderCount);
        Assert.Equal(2_500, account.LifetimeSpendCents);
        Assert.Equal(lastOrderAt, account.LastOrderAt);
        Assert.Equal(joinedAt, account.JoinedAt);

        var guest = Assert.Single(response.Items, item => item.Email == guestEmail);
        Assert.False(guest.Registered);
        Assert.Equal("Guest Buyer", guest.Name);
        Assert.Equal(1, guest.OrderCount);
        Assert.Equal(1_200, guest.LifetimeSpendCents);
        Assert.DoesNotContain(response.Items, item => item.Email == adminEmail);
    }

    [Fact]
    public async Task Notify_me_lists_product_details_and_searches_by_title()
    {
        var marker = Guid.NewGuid().ToString("N");
        var slug = $"product-{marker}";
        var email = $"waiting-{marker}@example.com";
        var createdAt = new DateTime(2026, 2, 3, 4, 5, 0, DateTimeKind.Utc);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Products.Add(new Product
            {
                Slug = slug,
                Title = $"Moonlight {marker}",
                Excerpt = "",
                Description = [],
                PriceCents = 1_000,
                Available = false,
                ProductType = ProductType.Physical,
                Images = [],
                Options = [],
                Tags = [],
            });
            db.NotifyMeRequests.Add(new NotifyMeRequest
            {
                Email = email,
                ProductSlug = slug,
                CreatedAt = createdAt,
            });
            await db.SaveChangesAsync();
        }

        var client = await _factory.CreateAdminClientAsync();
        var response = await client.GetFromJsonAsync<AdminPagedResponse<AdminNotifyMeListItem>>(
            $"/api/admin/notify-me?q=Moonlight%20{marker}&page=1&pageSize=25");

        Assert.NotNull(response);
        var item = Assert.Single(response!.Items);
        Assert.Equal(email, item.Email);
        Assert.Equal(slug, item.ProductSlug);
        Assert.Equal($"Moonlight {marker}", item.ProductTitle);
        Assert.Equal(createdAt, item.CreatedAt);
    }

    [Fact]
    public async Task Subscribers_returns_a_paged_searchable_list()
    {
        var marker = Guid.NewGuid().ToString("N");
        var email = $"reader-{marker}@example.com";
        var createdAt = new DateTime(2026, 3, 4, 5, 6, 0, DateTimeKind.Utc);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.NewsletterSubscribers.Add(new NewsletterSubscriber { Email = email, CreatedAt = createdAt });
            await db.SaveChangesAsync();
        }

        var client = await _factory.CreateAdminClientAsync();
        var response = await client.GetFromJsonAsync<AdminPagedResponse<AdminSubscriberListItem>>(
            $"/api/admin/subscribers?q={marker}&page=0&pageSize=500");

        Assert.NotNull(response);
        Assert.Equal(1, response!.Page);
        Assert.Equal(100, response.PageSize);
        var item = Assert.Single(response.Items);
        Assert.Equal(email, item.Email);
        Assert.Equal(createdAt, item.CreatedAt);
    }

    [Theory]
    [InlineData("/api/admin/customers")]
    [InlineData("/api/admin/notify-me")]
    [InlineData("/api/admin/subscribers")]
    public async Task Audience_lists_require_admin_auth(string path)
    {
        var response = await _factory.CreateClient().GetAsync(path);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
