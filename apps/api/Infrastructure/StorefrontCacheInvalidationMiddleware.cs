using JovieJoy.Api.Services;

namespace JovieJoy.Api.Infrastructure;

/// <summary>
/// After a successful CMS mutation has committed, asks the Next.js storefront to
/// expire only the affected server-side caches. Delivery failures are logged and
/// swallowed: the CMS save is already committed, and time-based ISR remains the
/// fallback for customers.
/// </summary>
public sealed class StorefrontCacheInvalidationMiddleware(
    RequestDelegate next,
    ILogger<StorefrontCacheInvalidationMiddleware> logger)
{
    public async Task InvokeAsync(
        HttpContext context,
        IStorefrontCacheInvalidator invalidator)
    {
        var scopes = ResolveScopes(context.Request);
        Exception? downstreamException = null;
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            // Several controllers commit the database before cleaning up an old
            // upload. If cleanup fails, the response throws but the storefront
            // data has still changed. An unnecessary purge is safer than a
            // missed purge, so attempt invalidation and then preserve the error.
            downstreamException = exception;
        }

        if (scopes.Count > 0 &&
            (downstreamException is not null || context.Response.StatusCode is >= 200 and < 300))
        {
            try
            {
                // Do not use RequestAborted here. Once the database commit succeeds,
                // a browser disconnect must not leave the storefront stale.
                await invalidator.InvalidateAsync(scopes, CancellationToken.None);
            }
            catch (Exception exception)
            {
                logger.LogWarning(
                    exception,
                    "CMS save may have succeeded, but storefront cache invalidation failed for scopes {Scopes}. Time-based ISR remains the fallback.",
                    string.Join(",", scopes));
            }
        }

        if (downstreamException is not null)
            System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(downstreamException).Throw();
    }

    internal static IReadOnlyCollection<string> ResolveScopes(HttpRequest request)
    {
        if (!IsMutation(request.Method) || !request.Path.StartsWithSegments("/api/admin"))
            return [];

        var path = request.Path.Value?.TrimEnd('/').ToLowerInvariant() ?? "";

        if (path == "/api/admin/products/import")
        {
            return request.Query.TryGetValue("dryRun", out var dryRun) &&
                   bool.TryParse(dryRun.ToString(), out var isDryRun) &&
                   !isDryRun
                ? [StorefrontCacheScopes.Catalog]
                : [];
        }

        if (path.EndsWith("/images", StringComparison.Ordinal) &&
            path.StartsWith("/api/admin/products/", StringComparison.Ordinal))
        {
            var intent = request.Query["intent"].ToString();
            return intent.Equals("asset", StringComparison.OrdinalIgnoreCase)
                ? []
                : [StorefrontCacheScopes.Catalog];
        }

        if (IsStagingOrOperationalMutation(path))
            return [];

        if (path == "/api/admin/products" ||
            path == "/api/admin/products/bulk" ||
            path.EndsWith("/pdf", StringComparison.Ordinal) && path.StartsWith("/api/admin/products/", StringComparison.Ordinal) ||
            path.StartsWith("/api/admin/products/", StringComparison.Ordinal) ||
            path == "/api/admin/collections" ||
            path.StartsWith("/api/admin/collections/", StringComparison.Ordinal))
        {
            return [StorefrontCacheScopes.Catalog];
        }

        if (path == "/api/admin/content" ||
            path.StartsWith("/api/admin/content/", StringComparison.Ordinal) ||
            path == "/api/admin/navigation" ||
            path.StartsWith("/api/admin/footer-links", StringComparison.Ordinal) ||
            path.StartsWith("/api/admin/social-links", StringComparison.Ordinal) ||
            path.StartsWith("/api/admin/featured-on", StringComparison.Ordinal) ||
            path.StartsWith("/api/admin/trending-terms", StringComparison.Ordinal))
        {
            return [StorefrontCacheScopes.Content];
        }

        if (path == "/api/admin/static-pages" || path.StartsWith("/api/admin/static-pages/", StringComparison.Ordinal))
            return [StorefrontCacheScopes.Pages];
        if (path == "/api/admin/about" || path.StartsWith("/api/admin/about/", StringComparison.Ordinal))
            return [StorefrontCacheScopes.About];
        if (path == "/api/admin/blogs" || path.StartsWith("/api/admin/blogs/", StringComparison.Ordinal))
            return [StorefrontCacheScopes.Blogs];
        if (path == "/api/admin/comics" || path.StartsWith("/api/admin/comics/", StringComparison.Ordinal))
            return [StorefrontCacheScopes.Comics];
        if (path == "/api/admin/gallery" || path.StartsWith("/api/admin/gallery/", StringComparison.Ordinal))
            return [StorefrontCacheScopes.Gallery];
        if (path == "/api/admin/faqs" || path.StartsWith("/api/admin/faqs/", StringComparison.Ordinal))
            return [StorefrontCacheScopes.Faqs];
        if (path == "/api/admin/freebies" || path.StartsWith("/api/admin/freebies/", StringComparison.Ordinal))
            return [StorefrontCacheScopes.Freebies];

        return [];
    }

    private static bool IsMutation(string method) =>
        HttpMethods.IsPost(method) ||
        HttpMethods.IsPut(method) ||
        HttpMethods.IsPatch(method) ||
        HttpMethods.IsDelete(method);

    private static bool IsStagingOrOperationalMutation(string path) =>
        path == "/api/admin/uploads" ||
        path == "/api/admin/products/assets" ||
        path.EndsWith("/duplicate", StringComparison.Ordinal) && path.StartsWith("/api/admin/products/", StringComparison.Ordinal) ||
        path.EndsWith("/image", StringComparison.Ordinal) &&
            (path.StartsWith("/api/admin/content/", StringComparison.Ordinal) ||
             path.StartsWith("/api/admin/about/", StringComparison.Ordinal) ||
             path.StartsWith("/api/admin/blogs/", StringComparison.Ordinal) ||
             path.StartsWith("/api/admin/comics/", StringComparison.Ordinal) ||
             path.StartsWith("/api/admin/featured-on/", StringComparison.Ordinal)) ||
        path == "/api/admin/gallery/upload" ||
        path.Contains("/requests/", StringComparison.Ordinal) && path.EndsWith("/resend", StringComparison.Ordinal) ||
        path.StartsWith("/api/admin/orders/", StringComparison.Ordinal) && path.EndsWith("/resend-downloads", StringComparison.Ordinal);
}
