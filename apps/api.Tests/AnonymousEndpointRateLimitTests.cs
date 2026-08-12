using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;

namespace JovieJoy.Api.Tests;

public sealed class AnonymousEndpointRateLimitApiFactory : ApiFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("RateLimiting:Checkout:PermitLimit", "2");
        builder.UseSetting("RateLimiting:Checkout:WindowSeconds", "3600");
        builder.UseSetting("RateLimiting:FreebieRequest:PermitLimit", "2");
        builder.UseSetting("RateLimiting:FreebieRequest:WindowSeconds", "3600");
    }
}

public sealed class AnonymousEndpointRateLimitTests : IClassFixture<AnonymousEndpointRateLimitApiFactory>
{
    private readonly AnonymousEndpointRateLimitApiFactory _factory;

    public AnonymousEndpointRateLimitTests(AnonymousEndpointRateLimitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Checkout_requests_are_rate_limited_per_client_ip()
    {
        var client = _factory.CreateClient();
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var response = await client.PostAsJsonAsync("/api/checkout", new
            {
                email = "invalid",
                items = Array.Empty<object>(),
            });
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        var limited = await client.PostAsJsonAsync("/api/checkout", new
        {
            email = "invalid",
            items = Array.Empty<object>(),
        });
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
    }

    [Fact]
    public async Task Freebie_email_requests_use_an_independent_rate_limit()
    {
        var client = _factory.CreateClient();
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var response = await client.PostAsJsonAsync("/api/freebies/not-needed/request", new
            {
                email = "invalid",
                optIn = false,
            });
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        var limited = await client.PostAsJsonAsync("/api/freebies/not-needed/request", new
        {
            email = "invalid",
            optIn = false,
        });
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
    }
}
