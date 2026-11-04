using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Services;

public interface IEmailSender
{
    Task SendFreebieDownloadAsync(string to, Freebie freebie, string downloadUrl, CancellationToken ct);
    Task SendProductDownloadsAsync(
        string to,
        string? customerName,
        IReadOnlyList<ProductDownloadEmailItem> downloads,
        CancellationToken ct);

    /// <summary>
    /// Sends one marketing email. When <paramref name="idempotencyKey"/> is set, a retry
    /// with the same key inside 24 hours cannot deliver a second copy.
    /// </summary>
    /// <exception cref="EmailRateLimitedException">The provider asked us to slow down.</exception>
    Task SendCampaignEmailAsync(CampaignEmailMessage message, string? idempotencyKey, CancellationToken ct);
}

public sealed record CampaignEmailMessage(
    string To,
    string Subject,
    string Html,
    string Text,
    string? OneClickUnsubscribeUrl,
    string? ReplyTo);

public sealed class EmailRateLimitedException(string message) : Exception(message);

public sealed record ProductDownloadEmailItem(string Title, string DownloadUrl, DateTime ExpiresAtUtc);
