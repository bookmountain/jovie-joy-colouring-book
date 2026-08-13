using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace JovieJoy.Api.Tests;

public class StorefrontCacheInvalidationPipelineTests
{
    [Fact]
    public async Task A_real_successful_admin_save_reaches_the_invalidator()
    {
        using var factory = new StorefrontCacheApiFactory();
        var client = await factory.CreateAdminClientAsync();
        var key = $"pipeline.cache.{Guid.NewGuid():N}";

        var response = await client.PutAsJsonAsync($"/api/admin/content/{key}", new
        {
            type = "HomeVideo",
            data = new { title = "Live after save" },
            sortIndex = 0,
        });

        response.EnsureSuccessStatusCode();
        Assert.Contains(factory.Invalidator.Calls, scopes => scopes.SequenceEqual(["content"]));
    }

    [Fact]
    public async Task A_rejected_admin_save_does_not_reach_the_invalidator()
    {
        using var factory = new StorefrontCacheApiFactory();
        var client = await factory.CreateAdminClientAsync();
        var key = $"pipeline.cache.{Guid.NewGuid():N}";

        var response = await client.PutAsJsonAsync($"/api/admin/content/{key}", new
        {
            type = "RetiredOrUnknown",
            data = new { title = "Must not invalidate" },
            sortIndex = 0,
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(factory.Invalidator.Calls);
    }

    private sealed class StorefrontCacheApiFactory : ApiFactory
    {
        public RecordingInvalidator Invalidator { get; } = new();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IStorefrontCacheInvalidator>();
                services.AddSingleton<IStorefrontCacheInvalidator>(Invalidator);
            });
        }
    }

    private sealed class RecordingInvalidator : IStorefrontCacheInvalidator
    {
        public ConcurrentQueue<string[]> Calls { get; } = new();

        public Task InvalidateAsync(
            IReadOnlyCollection<string> scopes,
            CancellationToken cancellationToken = default)
        {
            Calls.Enqueue(scopes.ToArray());
            return Task.CompletedTask;
        }
    }
}
