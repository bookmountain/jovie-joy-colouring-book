using System.Collections.Concurrent;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;

namespace JovieJoy.Api.Tests;

public class FakeEmailSender : IEmailSender
{
    public ConcurrentBag<(string To, string Slug, string Url)> Sent { get; } = new();

    public Task SendFreebieDownloadAsync(string to, Freebie f, string url, CancellationToken ct)
    {
        Sent.Add((to, f.Slug, url));
        return Task.CompletedTask;
    }

    public List<(string To, string? Name, IReadOnlyList<ProductDownloadEmailItem> Downloads)> ProductDownloadEmails { get; } = [];

    public Task SendProductDownloadsAsync(
        string to,
        string? customerName,
        IReadOnlyList<ProductDownloadEmailItem> downloads,
        CancellationToken ct)
    {
        ProductDownloadEmails.Add((to, customerName, downloads));
        return Task.CompletedTask;
    }

    public List<(CampaignEmailMessage Message, string? IdempotencyKey)> CampaignEmails { get; } = [];
    public List<(CampaignEmailMessage Message, string? IdempotencyKey)> CampaignAttempts { get; } = [];
    public Func<CampaignEmailMessage, Exception?>? CampaignFailure { get; set; }

    public Task SendCampaignEmailAsync(CampaignEmailMessage message, string? idempotencyKey, CancellationToken ct)
    {
        CampaignAttempts.Add((message, idempotencyKey));
        var failure = CampaignFailure?.Invoke(message);
        if (failure is not null) throw failure;
        CampaignEmails.Add((message, idempotencyKey));
        return Task.CompletedTask;
    }
}
