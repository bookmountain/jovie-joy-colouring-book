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
}
