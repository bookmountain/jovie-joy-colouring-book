using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace JovieJoy.Api.Services;

public static class StorefrontCacheScopes
{
    public const string Content = "content";
    public const string Catalog = "catalog";
    public const string Blogs = "blogs";
    public const string Comics = "comics";
    public const string About = "about";
    public const string Gallery = "gallery";
    public const string Pages = "pages";
    public const string Faqs = "faqs";
    public const string Freebies = "freebies";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Content,
        Catalog,
        Blogs,
        Comics,
        About,
        Gallery,
        Pages,
        Faqs,
        Freebies,
    };
}

public sealed class StorefrontCacheOptions
{
    public string Endpoint { get; set; } = "";
    public string Secret { get; set; } = "";
    public int TimeoutSeconds { get; set; } = 2;
}

public interface IStorefrontCacheInvalidator
{
    Task InvalidateAsync(
        IReadOnlyCollection<string> scopes,
        CancellationToken cancellationToken = default);
}

public sealed class StorefrontCacheInvalidator(
    HttpClient httpClient,
    IOptions<StorefrontCacheOptions> options) : IStorefrontCacheInvalidator
{
    private const string SecretHeader = "x-cache-revalidation-secret";
    private readonly StorefrontCacheOptions _options = options.Value;

    public async Task InvalidateAsync(
        IReadOnlyCollection<string> scopes,
        CancellationToken cancellationToken = default)
    {
        var uniqueScopes = scopes
            .Where(scope => !string.IsNullOrWhiteSpace(scope))
            .Where(StorefrontCacheScopes.All.Contains)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        if (uniqueScopes.Length == 0 ||
            string.IsNullOrWhiteSpace(_options.Endpoint) ||
            string.IsNullOrWhiteSpace(_options.Secret))
        {
            return;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, _options.Endpoint)
        {
            Content = JsonContent.Create(new { scopes = uniqueScopes }),
        };
        request.Headers.TryAddWithoutValidation(SecretHeader, _options.Secret);

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(_options.TimeoutSeconds, 1, 30)));

        using var response = await httpClient.SendAsync(
            request,
            HttpCompletionOption.ResponseHeadersRead,
            timeout.Token);
        response.EnsureSuccessStatusCode();
    }
}
