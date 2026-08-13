using JovieJoy.Api.Infrastructure;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace JovieJoy.Api.Tests;

public class StorefrontCacheInvalidationMiddlewareTests
{
    public static TheoryData<string, string, string, string?> RouteCases => new()
    {
        { "POST", "/api/admin/products", "", "catalog" },
        { "POST", "/api/admin/products/import", "", null },
        { "POST", "/api/admin/products/import", "?dryRun=true", null },
        { "POST", "/api/admin/products/import", "?dryRun=false", "catalog" },
        { "PUT", "/api/admin/products/cozy", "", "catalog" },
        { "DELETE", "/api/admin/products/cozy", "", "catalog" },
        { "POST", "/api/admin/products/cozy/duplicate", "", null },
        { "POST", "/api/admin/products/cozy/images", "", "catalog" },
        { "POST", "/api/admin/products/cozy/images", "?intent=gallery", "catalog" },
        { "POST", "/api/admin/products/cozy/images", "?intent=asset", null },
        { "DELETE", "/api/admin/products/assets", "", null },
        { "POST", "/api/admin/products/cozy/pdf", "", "catalog" },
        { "POST", "/api/admin/products/bulk", "", "catalog" },
        { "POST", "/api/admin/collections", "", "catalog" },
        { "PUT", "/api/admin/collections/new", "", "catalog" },
        { "DELETE", "/api/admin/collections/new", "", "catalog" },
        { "POST", "/api/admin/collections/new/hero-image", "", "catalog" },
        { "PUT", "/api/admin/content/home.hero", "", "content" },
        { "DELETE", "/api/admin/content/home.hero", "", "content" },
        { "POST", "/api/admin/content/home.hero/image", "", null },
        { "PUT", "/api/admin/navigation", "", "content" },
        { "POST", "/api/admin/footer-links", "", "content" },
        { "DELETE", "/api/admin/social-links/instagram", "", "content" },
        { "PUT", "/api/admin/featured-on/example", "", "content" },
        { "POST", "/api/admin/featured-on/example/image", "", null },
        { "POST", "/api/admin/trending-terms", "", "content" },
        { "POST", "/api/admin/static-pages", "", "pages" },
        { "PUT", "/api/admin/static-pages/contact", "", "pages" },
        { "POST", "/api/admin/about", "", "about" },
        { "DELETE", "/api/admin/about/00000000-0000-0000-0000-000000000001", "", "about" },
        { "POST", "/api/admin/about/00000000-0000-0000-0000-000000000001/image", "", null },
        { "POST", "/api/admin/blogs", "", "blogs" },
        { "POST", "/api/admin/blogs/diy/articles", "", "blogs" },
        { "PUT", "/api/admin/blogs/diy/articles/tips", "", "blogs" },
        { "POST", "/api/admin/blogs/diy/articles/tips/image", "", null },
        { "POST", "/api/admin/comics", "", "comics" },
        { "DELETE", "/api/admin/comics/00000000-0000-0000-0000-000000000001", "", "comics" },
        { "POST", "/api/admin/comics/00000000-0000-0000-0000-000000000001/comics/00000000-0000-0000-0000-000000000002/image", "", null },
        { "POST", "/api/admin/gallery", "", "gallery" },
        { "PUT", "/api/admin/gallery/00000000-0000-0000-0000-000000000001", "", "gallery" },
        { "POST", "/api/admin/gallery/upload", "", null },
        { "POST", "/api/admin/faqs", "", "faqs" },
        { "DELETE", "/api/admin/faqs/shipping", "", "faqs" },
        { "POST", "/api/admin/freebies", "", "freebies" },
        { "PUT", "/api/admin/freebies/sample", "", "freebies" },
        { "POST", "/api/admin/freebies/reorder", "", "freebies" },
        { "POST", "/api/admin/freebies/sample/cover", "", "freebies" },
        { "POST", "/api/admin/freebies/sample/file", "", "freebies" },
        { "POST", "/api/admin/freebies/sample/requests/00000000-0000-0000-0000-000000000001/resend", "", null },
        { "POST", "/api/admin/orders/00000000-0000-0000-0000-000000000001/resend-downloads", "", null },
        { "POST", "/api/admin/uploads", "", null },
        { "POST", "/api/admin/unknown", "", null },
        { "GET", "/api/admin/products", "", null },
        { "POST", "/api/newsletter", "", null },
    };

    [Theory]
    [MemberData(nameof(RouteCases))]
    public async Task Invalidates_only_mutations_that_change_public_storefront_data(
        string method,
        string path,
        string query,
        string? expectedScope)
    {
        var invalidator = new RecordingInvalidator();
        var middleware = CreateMiddleware(_ => Task.CompletedTask);
        var context = Context(method, path, query, StatusCodes.Status200OK);

        await middleware.InvokeAsync(context, invalidator);

        if (expectedScope is null)
            Assert.Empty(invalidator.Calls);
        else
            Assert.Equal([[expectedScope]], invalidator.Calls);
    }

    [Theory]
    [InlineData(199, 0)]
    [InlineData(200, 1)]
    [InlineData(201, 1)]
    [InlineData(204, 1)]
    [InlineData(299, 1)]
    [InlineData(300, 0)]
    [InlineData(400, 0)]
    [InlineData(500, 0)]
    public async Task Only_successful_responses_invalidate(int statusCode, int expectedCalls)
    {
        var invalidator = new RecordingInvalidator();
        var middleware = CreateMiddleware(_ => Task.CompletedTask);
        var context = Context(HttpMethods.Put, "/api/admin/content/home.hero", "", statusCode);

        await middleware.InvokeAsync(context, invalidator);

        Assert.Equal(expectedCalls, invalidator.Calls.Count);
    }

    [Fact]
    public async Task Invalidation_runs_after_the_request_handler_finishes()
    {
        var events = new List<string>();
        var invalidator = new RecordingInvalidator(() => events.Add("invalidate"));
        var middleware = CreateMiddleware(_ =>
        {
            events.Add("handler");
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(
            Context(HttpMethods.Put, "/api/admin/content/home.hero"),
            invalidator);

        Assert.Equal(["handler", "invalidate"], events);
    }

    [Fact]
    public async Task A_handler_exception_propagates_after_defensive_invalidation()
    {
        var invalidator = new RecordingInvalidator();
        var middleware = CreateMiddleware(_ => throw new InvalidOperationException("save failed"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            middleware.InvokeAsync(
                Context(HttpMethods.Put, "/api/admin/content/home.hero"),
                invalidator));

        Assert.Equal("save failed", error.Message);
        Assert.Equal([["content"]], invalidator.Calls);
    }

    [Fact]
    public async Task An_invalidation_failure_does_not_turn_a_committed_save_into_an_error()
    {
        var invalidator = new RecordingInvalidator(throwOnCall: true);
        var middleware = CreateMiddleware(_ => Task.CompletedTask);
        var context = Context(HttpMethods.Put, "/api/admin/content/home.hero", "", StatusCodes.Status204NoContent);

        await middleware.InvokeAsync(context, invalidator);

        Assert.Equal(StatusCodes.Status204NoContent, context.Response.StatusCode);
        Assert.Single(invalidator.Calls);
    }

    [Fact]
    public async Task Invalidation_failure_does_not_hide_the_original_handler_exception()
    {
        var invalidator = new RecordingInvalidator(throwOnCall: true);
        var middleware = CreateMiddleware(_ => throw new InvalidOperationException("cleanup failed"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            middleware.InvokeAsync(
                Context(HttpMethods.Put, "/api/admin/content/home.hero"),
                invalidator));

        Assert.Equal("cleanup failed", error.Message);
        Assert.Single(invalidator.Calls);
    }

    [Fact]
    public async Task Client_disconnect_after_commit_does_not_cancel_invalidation()
    {
        using var disconnected = new CancellationTokenSource();
        disconnected.Cancel();
        var invalidator = new RecordingInvalidator();
        var middleware = CreateMiddleware(_ => Task.CompletedTask);
        var context = Context(HttpMethods.Put, "/api/admin/content/home.hero");
        context.RequestAborted = disconnected.Token;

        await middleware.InvokeAsync(context, invalidator);

        Assert.Equal(CancellationToken.None, invalidator.CancellationTokens.Single());
    }

    private static StorefrontCacheInvalidationMiddleware CreateMiddleware(RequestDelegate next) =>
        new(next, NullLogger<StorefrontCacheInvalidationMiddleware>.Instance);

    private static DefaultHttpContext Context(
        string method,
        string path,
        string query = "",
        int statusCode = StatusCodes.Status200OK)
    {
        var context = new DefaultHttpContext();
        context.Request.Method = method;
        context.Request.Path = path;
        context.Request.QueryString = new QueryString(query);
        context.Response.StatusCode = statusCode;
        return context;
    }

    private sealed class RecordingInvalidator(
        Action? onCall = null,
        bool throwOnCall = false) : IStorefrontCacheInvalidator
    {
        public List<string[]> Calls { get; } = [];
        public List<CancellationToken> CancellationTokens { get; } = [];

        public Task InvalidateAsync(
            IReadOnlyCollection<string> scopes,
            CancellationToken cancellationToken = default)
        {
            Calls.Add(scopes.ToArray());
            CancellationTokens.Add(cancellationToken);
            onCall?.Invoke();
            return throwOnCall
                ? Task.FromException(new HttpRequestException("storefront unavailable"))
                : Task.CompletedTask;
        }
    }
}
