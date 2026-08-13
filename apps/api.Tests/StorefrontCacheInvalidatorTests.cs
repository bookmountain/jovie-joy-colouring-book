using System.Net;
using System.Text.Json;
using JovieJoy.Api.Services;
using Microsoft.Extensions.Options;

namespace JovieJoy.Api.Tests;

public class StorefrontCacheInvalidatorTests
{
    [Fact]
    public async Task Posts_deduplicated_scopes_with_the_shared_secret()
    {
        var handler = new RecordingHandler(HttpStatusCode.OK);
        var service = CreateService(handler);

        await service.InvalidateAsync(["catalog", "gallery", "catalog"]);

        Assert.Equal(HttpMethod.Post, handler.Method);
        Assert.Equal("http://web:3000/api/internal/revalidate", handler.Uri?.ToString());
        Assert.Equal("test-secret-with-at-least-32-characters", handler.Secret);
        Assert.Equal("application/json", handler.ContentType);
        using var body = JsonDocument.Parse(Assert.IsType<string>(handler.Body));
        Assert.Equal(
            ["catalog", "gallery"],
            body.RootElement.GetProperty("scopes").EnumerateArray().Select(item => item.GetString()));
    }

    [Fact]
    public async Task Throws_when_the_storefront_rejects_the_request()
    {
        var service = CreateService(new RecordingHandler(HttpStatusCode.ServiceUnavailable));

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            service.InvalidateAsync([StorefrontCacheScopes.Content]));
    }

    [Fact]
    public async Task Empty_scopes_do_not_send_a_request()
    {
        var handler = new RecordingHandler(HttpStatusCode.OK);
        var service = CreateService(handler);

        await service.InvalidateAsync([]);

        Assert.Equal(0, handler.Calls);
    }

    [Fact]
    public async Task Unknown_scopes_are_not_forwarded()
    {
        var handler = new RecordingHandler(HttpStatusCode.OK);
        var service = CreateService(handler);

        await service.InvalidateAsync(["everything", StorefrontCacheScopes.Catalog]);

        using var body = JsonDocument.Parse(Assert.IsType<string>(handler.Body));
        Assert.Equal(
            [StorefrontCacheScopes.Catalog],
            body.RootElement.GetProperty("scopes").EnumerateArray().Select(item => item.GetString()));
    }

    [Theory]
    [InlineData("", "test-secret-with-at-least-32-characters")]
    [InlineData("http://web:3000/api/internal/revalidate", "")]
    public async Task Missing_local_configuration_is_a_no_op(string endpoint, string secret)
    {
        var handler = new RecordingHandler(HttpStatusCode.OK);
        var service = CreateService(handler, endpoint, secret);

        await service.InvalidateAsync([StorefrontCacheScopes.Catalog]);

        Assert.Equal(0, handler.Calls);
    }

    [Fact]
    public async Task Forwards_cancellation_to_the_HTTP_request()
    {
        var handler = new BlockingHandler();
        var service = CreateService(handler);
        using var cancellation = new CancellationTokenSource();

        var call = service.InvalidateAsync([StorefrontCacheScopes.Catalog], cancellation.Token);
        await handler.Entered.Task.WaitAsync(TimeSpan.FromSeconds(2));
        await cancellation.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => call);
    }

    private static StorefrontCacheInvalidator CreateService(
        HttpMessageHandler handler,
        string endpoint = "http://web:3000/api/internal/revalidate",
        string secret = "test-secret-with-at-least-32-characters") =>
        new(
            new HttpClient(handler),
            Options.Create(new StorefrontCacheOptions
            {
                Endpoint = endpoint,
                Secret = secret,
                TimeoutSeconds = 2,
            }));

    private sealed class RecordingHandler(HttpStatusCode statusCode) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        public HttpMethod? Method { get; private set; }
        public Uri? Uri { get; private set; }
        public string? Secret { get; private set; }
        public string? ContentType { get; private set; }
        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Calls++;
            Method = request.Method;
            Uri = request.RequestUri;
            Secret = request.Headers.GetValues("x-cache-revalidation-secret").Single();
            ContentType = request.Content?.Headers.ContentType?.MediaType;
            Body = request.Content is null
                ? null
                : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(statusCode);
        }
    }

    private sealed class BlockingHandler : HttpMessageHandler
    {
        public TaskCompletionSource Entered { get; } =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Entered.SetResult();
            await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }
}
