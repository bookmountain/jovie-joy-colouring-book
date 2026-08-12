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
}

public sealed record ProductDownloadEmailItem(string Title, string DownloadUrl, DateTime ExpiresAtUtc);
