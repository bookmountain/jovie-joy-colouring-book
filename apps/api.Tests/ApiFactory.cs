using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace JovieJoy.Api.Tests;

public class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");
        builder.UseSetting("ConnectionStrings:Default", "Host=ignored;Database=ignored;Username=ignored;Password=ignored");
        builder.UseSetting("Jwt:Secret", "test-secret-test-secret-test-secret-1234");
        builder.UseSetting("Jwt:Issuer", "jovie-joy-api");
        builder.UseSetting("Jwt:Audience", "jovie-joy-web");
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
            services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase("test-db"));
        });
    }
}
