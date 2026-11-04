using System.ComponentModel.DataAnnotations;
using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record EmailCampaignListItem(
    Guid Id, string Kind, string ItemSlug, string ItemTitle, string Status, string Subject,
    int RecipientCount, int SentCount, int FailedCount,
    DateTime CreatedAt, DateTime? ApprovedAt, DateTime? SentAt);

public record EmailCampaignListResponse(IReadOnlyList<EmailCampaignListItem> Items, int SubscriberCount);

public record EmailCampaignDetail(
    Guid Id, string Kind, string ItemSlug, string ItemTitle, string Status,
    string Subject, string Preheader, string Headline, string Body, string ButtonLabel,
    string ImageUrl, string? PriceLabel,
    bool ItemLive, int SubscriberCount, int RecipientCount, int SentCount, int FailedCount, int SkippedCount,
    DateTime CreatedAt, DateTime? ApprovedAt, DateTime? SentAt);

public record EmailCampaignPreview(string Subject, string Preheader, string Html, string Text);

public record UpdateEmailCampaignRequest(
    [Required, StringLength(200)] string Subject,
    [StringLength(300)] string? Preheader,
    [Required, StringLength(200)] string Headline,
    [Required, StringLength(5000)] string Body,
    [Required, StringLength(60)] string ButtonLabel);

public record EmailCampaignTestRequest([Required, EmailAddress, StringLength(320)] string To);
