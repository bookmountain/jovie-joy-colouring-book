using System.Net;
using System.Net.Http.Json;

namespace JovieJoy.Api.Tests;

public sealed class AdminLoginRateLimitTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public AdminLoginRateLimitTests(ApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Repeated_admin_login_attempts_are_rate_limited()
    {
        var client = _factory.CreateClient();
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var response = await client.PostAsJsonAsync("/auth/admin/login", new
            {
                email = "nobody@example.com",
                password = "wrong-password",
            });
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        var limited = await client.PostAsJsonAsync("/auth/admin/login", new
        {
            email = "nobody@example.com",
            password = "wrong-password",
        });
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
    }
}
