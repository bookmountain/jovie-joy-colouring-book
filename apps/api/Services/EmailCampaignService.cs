using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JovieJoy.Api.Services;

public class EmailCampaignOptions
{
    /// <summary>Shown in every footer. Required by anti-spam law; production sends are blocked without it.</summary>
    public string PostalAddress { get; set; } = "";
    public string? ReplyTo { get; set; }
    public bool WorkerEnabled { get; set; } = true;
    public TimeSpan PollInterval { get; set; } = TimeSpan.FromSeconds(15);
    /// <summary>Attempts per recipient before it is marked Failed and the worker moves on.</summary>
    public int MaxAttempts { get; set; } = 5;
}

public sealed class EmailCampaignConflictException(string message) : Exception(message);

/// <summary>
/// Turns newly live catalogue items into drafts for review, then delivers approved
/// campaigns. Nothing here sends without an admin approving a specific draft.
/// </summary>
public sealed class EmailCampaignService(
    AppDbContext db,
    IEmailSender email,
    IConfiguration config,
    IOptions<FreebiesOptions> freebieOptions,
    IOptions<EmailCampaignOptions> options,
    ILogger<EmailCampaignService> logger)
{
    private string SiteUrl => (config["WebAppUrl"] ?? "http://localhost:3000").TrimEnd('/');
    private string ApiUrl => freebieOptions.Value.BaseUrl.TrimEnd('/');

    public static string ItemUrlPath(EmailCampaign campaign) => campaign.Kind == EmailCampaignKind.Product
        ? $"/products/{Uri.EscapeDataString(campaign.ItemSlug)}"
        : "/pages/freebies";

    /// <summary>
    /// Creates one draft for each live item that has never had a campaign, and refreshes
    /// drafts whose copy nobody has touched. Polling (rather than hooks on save) also
    /// covers scheduled products, bulk publish and CSV import. An item that already has
    /// a campaign is never given another, which is why edits cannot cause a re-send.
    /// </summary>
    public async Task SyncDraftsAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var products = await db.Products.AsNoTracking()
            .Where(p => p.PublishedAt != null && p.PublishedAt <= now)
            .ToListAsync(ct);
        var freebies = await db.Freebies.AsNoTracking()
            .Where(f => f.Published && f.FilePath != "")
            .ToListAsync(ct);
        var campaigns = await db.EmailCampaigns.ToListAsync(ct);
        var byItem = campaigns.ToDictionary(c => (c.Kind, c.ItemId));

        var changed = false;
        foreach (var (kind, id, source) in products
                     .Select(p => (EmailCampaignKind.Product, p.Id, Draft(p)))
                     .Concat(freebies.Select(f => (EmailCampaignKind.Freebie, f.Id, Draft(f)))))
        {
            if (!byItem.TryGetValue((kind, id), out var existing))
            {
                db.EmailCampaigns.Add(source);
                changed = true;
            }
            else if (existing is { Status: EmailCampaignStatus.Draft, EditedAt: null })
            {
                changed |= CopyGeneratedContent(source, existing);
            }
        }
        if (!changed) return;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException exception)
        {
            // Another API instance won the race on the unique index. It created the
            // same draft, so there is nothing to do; the next tick reloads cleanly.
            logger.LogInformation(exception, "Email campaign sync lost a race; retrying next tick");
            db.ChangeTracker.Clear();
        }
    }

    private static bool CopyGeneratedContent(EmailCampaign from, EmailCampaign to)
    {
        var differs = to.ItemSlug != from.ItemSlug || to.ItemTitle != from.ItemTitle ||
                      to.Subject != from.Subject || to.Preheader != from.Preheader ||
                      to.Headline != from.Headline || to.Body != from.Body ||
                      to.ButtonLabel != from.ButtonLabel || to.ImageUrl != from.ImageUrl ||
                      to.PriceLabel != from.PriceLabel;
        if (!differs) return false;
        to.ItemSlug = from.ItemSlug;
        to.ItemTitle = from.ItemTitle;
        to.Subject = from.Subject;
        to.Preheader = from.Preheader;
        to.Headline = from.Headline;
        to.Body = from.Body;
        to.ButtonLabel = from.ButtonLabel;
        to.ImageUrl = from.ImageUrl;
        to.PriceLabel = from.PriceLabel;
        return true;
    }

    private static string Clip(string value, int max) => value.Length <= max ? value : value[..max].TrimEnd();

    private static EmailCampaign Draft(Product p) => new()
    {
        Kind = EmailCampaignKind.Product,
        ItemId = p.Id,
        ItemSlug = p.Slug,
        ItemTitle = Clip(p.Title, 300),
        Subject = Clip($"New from Zoe&Book: {p.Title}", 200),
        Preheader = Clip(string.IsNullOrWhiteSpace(p.Excerpt) ? "Something new just landed." : p.Excerpt, 300),
        Headline = Clip(p.Title, 200),
        Body = Clip(BodyWith("Something new just landed, and we think you'll love it.", p.Excerpt), 5000),
        ButtonLabel = "Take a look",
        ImageUrl = Clip(p.Images.FirstOrDefault() ?? "", 1000),
        PriceLabel = string.Create(CultureInfo.InvariantCulture, $"${p.PriceCents / 100m:0.00} USD"),
    };

    private static EmailCampaign Draft(Freebie f) => new()
    {
        Kind = EmailCampaignKind.Freebie,
        ItemId = f.Id,
        ItemSlug = f.Slug,
        ItemTitle = Clip(f.Title, 300),
        Subject = Clip($"A new freebie for you: {f.Title}", 200),
        Preheader = Clip(string.IsNullOrWhiteSpace(f.Excerpt) ? "Free to download, just for you." : f.Excerpt, 300),
        Headline = Clip(f.Title, 200),
        Body = Clip(BodyWith("We've just added a new freebie. It's yours to download and colour.", f.Excerpt), 5000),
        ButtonLabel = "Get it free",
        ImageUrl = Clip(f.CoverImage, 1000),
    };

    private static string BodyWith(string opening, string excerpt)
    {
        var parts = new List<string> { "Hi friend,", opening };
        if (!string.IsNullOrWhiteSpace(excerpt)) parts.Add(excerpt.Trim());
        parts.Add("Happy colouring,\nZoe&Book");
        return string.Join("\n\n", parts);
    }

    public async Task<bool> IsItemLiveAsync(EmailCampaign campaign, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        return campaign.Kind == EmailCampaignKind.Product
            ? await db.Products.AsNoTracking().AnyAsync(
                p => p.Id == campaign.ItemId && p.PublishedAt != null && p.PublishedAt <= now, ct)
            : await db.Freebies.AsNoTracking().AnyAsync(
                f => f.Id == campaign.ItemId && f.Published && f.FilePath != "", ct);
    }

    private string AbsoluteImageUrl(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return "";
        if (path.StartsWith("/uploads", StringComparison.Ordinal)) return ApiUrl + path;
        return path.StartsWith('/') ? SiteUrl + path : path;
    }

    public RenderedCampaignEmail Render(EmailCampaign campaign, string? unsubscribeToken)
    {
        var unsubscribeUrl = $"{SiteUrl}/unsubscribe?token={Uri.EscapeDataString(unsubscribeToken ?? "preview")}";
        return EmailCampaignTemplate.Render(campaign, new CampaignRenderLinks(
            SiteUrl + ItemUrlPath(campaign),
            AbsoluteImageUrl(campaign.ImageUrl),
            unsubscribeUrl,
            SiteUrl,
            options.Value.PostalAddress.Trim()));
    }

    /// <summary>Addresses that would receive this right now, de-duplicated by case.</summary>
    public async Task<List<string>> ActiveAudienceAsync(CancellationToken ct)
    {
        var subscribers = await db.NewsletterSubscribers.AsNoTracking()
            .Select(s => new { s.Email, s.UnsubscribedAt })
            .ToListAsync(ct);
        return subscribers
            .GroupBy(s => s.Email.Trim().ToLowerInvariant())
            .Where(group => group.All(s => s.UnsubscribedAt is null))
            .Select(group => group.Key)
            .Order(StringComparer.Ordinal)
            .ToList();
    }

    public Task SendTestAsync(EmailCampaign campaign, string to, CancellationToken ct)
    {
        var rendered = Render(campaign, null);
        return email.SendCampaignEmailAsync(
            new CampaignEmailMessage(
                to, $"[Test] {rendered.Subject}", rendered.Html, rendered.Text, null, ReplyTo),
            idempotencyKey: null,
            ct);
    }

    private string? ReplyTo =>
        string.IsNullOrWhiteSpace(options.Value.ReplyTo) ? null : options.Value.ReplyTo.Trim();

    /// <summary>
    /// Approves a draft: locks it and freezes the audience in one transaction. Actual
    /// delivery happens in the background so a restart mid-send simply resumes.
    /// </summary>
    public async Task<int> ApproveAsync(EmailCampaign campaign, CancellationToken ct)
    {
        if (campaign.Status != EmailCampaignStatus.Draft)
            throw new EmailCampaignConflictException("This email has already been sent or isn't a draft.");

        var audience = await ActiveAudienceAsync(ct);
        if (audience.Count == 0)
            throw new EmailCampaignConflictException("There are no subscribers to send to yet.");

        campaign.Status = EmailCampaignStatus.Sending;
        campaign.ApprovedAt = DateTime.UtcNow;
        db.EmailCampaignRecipients.AddRange(audience.Select(address => new EmailCampaignRecipient
        {
            CampaignId = campaign.Id,
            Email = address,
        }));

        try
        {
            // Status is a concurrency token, so this UPDATE only matches while the row
            // is still Draft. A second simultaneous approval affects zero rows and fails.
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new EmailCampaignConflictException("This email is already being sent.");
        }
        return audience.Count;
    }

    private static string IdempotencyKey(Guid campaignId, string address)
    {
        var hash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(address)));
        return $"campaign-{campaignId:N}-{hash}";
    }

    /// <summary>
    /// Delivers everything Pending. Each result is saved straight away, and each send
    /// carries a per-person idempotency key, so a crash between "sent" and "saved"
    /// cannot give anyone a second copy when this resumes.
    /// </summary>
    public async Task DispatchAsync(CancellationToken ct)
    {
        var sending = await db.EmailCampaigns
            .Where(c => c.Status == EmailCampaignStatus.Sending)
            .OrderBy(c => c.ApprovedAt)
            .ToListAsync(ct);

        foreach (var campaign in sending)
        {
            var pending = await db.EmailCampaignRecipients
                .Where(r => r.CampaignId == campaign.Id && r.Status == EmailRecipientStatus.Pending)
                .OrderBy(r => r.Email)
                .ToListAsync(ct);

            foreach (var recipient in pending)
            {
                // Checked per send so someone who unsubscribes mid-campaign is honoured.
                var variants = await db.NewsletterSubscribers.AsNoTracking()
                    .Where(s => s.Email.ToLower() == recipient.Email)
                    .ToListAsync(ct);
                if (variants.Count == 0 || variants.Any(s => s.UnsubscribedAt is not null))
                {
                    recipient.Status = EmailRecipientStatus.Skipped;
                    await db.SaveChangesAsync(ct);
                    continue;
                }

                var token = variants[0].UnsubscribeToken;
                var rendered = Render(campaign, token);
                var message = new CampaignEmailMessage(
                    recipient.Email, rendered.Subject, rendered.Html, rendered.Text,
                    $"{ApiUrl}/api/newsletter/unsubscribe/{Uri.EscapeDataString(token)}", ReplyTo);

                try
                {
                    await email.SendCampaignEmailAsync(message, IdempotencyKey(campaign.Id, recipient.Email), ct);
                    recipient.Status = EmailRecipientStatus.Sent;
                    recipient.SentAt = DateTime.UtcNow;
                    recipient.LastError = null;
                }
                catch (EmailRateLimitedException exception)
                {
                    // Not this person's fault: stop and carry on from here next tick.
                    logger.LogWarning(exception, "Email campaign {CampaignId} paused by rate limit", campaign.Id);
                    return;
                }
                catch (Exception exception) when (!ct.IsCancellationRequested)
                {
                    // Includes HttpClient timeouts, which are OperationCanceledException
                    // without our token being cancelled.
                    logger.LogError(exception, "Email campaign {CampaignId} send failed", campaign.Id);
                    recipient.Attempts += 1;
                    recipient.LastError = Clip(exception.Message, 500);
                    if (recipient.Attempts >= options.Value.MaxAttempts)
                        recipient.Status = EmailRecipientStatus.Failed;
                }
                await db.SaveChangesAsync(ct);
            }

            if (!await db.EmailCampaignRecipients.AnyAsync(
                    r => r.CampaignId == campaign.Id && r.Status == EmailRecipientStatus.Pending, ct))
            {
                campaign.Status = EmailCampaignStatus.Sent;
                campaign.SentAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);
            }
        }
    }
}

public sealed class EmailCampaignHostedService(
    IServiceScopeFactory scopeFactory,
    IOptions<EmailCampaignOptions> options,
    ILogger<EmailCampaignHostedService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.WorkerEnabled || options.Value.PollInterval <= TimeSpan.Zero) return;

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(options.Value.PollInterval, stoppingToken);
                try
                {
                    await using var scope = scopeFactory.CreateAsyncScope();
                    var service = scope.ServiceProvider.GetRequiredService<EmailCampaignService>();
                    await service.SyncDraftsAsync(stoppingToken);
                    await service.DispatchAsync(stoppingToken);
                }
                catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
                {
                    logger.LogError(exception, "Email campaign worker tick failed; retrying next tick");
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal host shutdown.
        }
    }
}
