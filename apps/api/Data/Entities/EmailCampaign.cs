namespace JovieJoy.Api.Data.Entities;

public enum EmailCampaignKind { Product, Freebie }

public enum EmailCampaignStatus
{
    /// <summary>Waiting for an admin to review and send.</summary>
    Draft,
    /// <summary>Approved. The background worker is delivering it. Content is locked.</summary>
    Sending,
    /// <summary>Delivery finished. Content is locked and it can never go out again.</summary>
    Sent,
    /// <summary>An admin chose not to announce this item. Can be moved back to Draft.</summary>
    Skipped,
    /// <summary>
    /// Item was already live when this feature shipped. Hidden from the admin UI;
    /// exists only so the old catalogue never produces drafts.
    /// </summary>
    Baseline,
}

public enum EmailRecipientStatus { Pending, Sent, Failed, Skipped }

/// <summary>
/// One announcement for one catalogue item. The unique (Kind, ItemId) index is the
/// core duplicate guard: an item has at most one campaign, ever, so editing,
/// unpublishing or republishing it can never produce a second announcement.
/// </summary>
public class EmailCampaign
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public EmailCampaignKind Kind { get; set; }
    // Deliberately not a foreign key: the send history outlives a deleted product.
    public Guid ItemId { get; set; }
    public string ItemSlug { get; set; } = null!;
    public string ItemTitle { get; set; } = null!;
    public EmailCampaignStatus Status { get; set; } = EmailCampaignStatus.Draft;

    public string Subject { get; set; } = null!;
    public string Preheader { get; set; } = "";
    public string Headline { get; set; } = null!;
    public string Body { get; set; } = null!;
    public string ButtonLabel { get; set; } = null!;
    public string ImageUrl { get; set; } = "";
    public string? PriceLabel { get; set; }

    /// <summary>Set once an admin edits the copy; generated text then stops following the item.</summary>
    public DateTime? EditedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAt { get; set; }
    public DateTime? SentAt { get; set; }

    public ICollection<EmailCampaignRecipient> Recipients { get; set; } = new List<EmailCampaignRecipient>();
}

/// <summary>
/// Frozen audience for a campaign. The (CampaignId, Email) key means one address
/// appears once per campaign, however many case variants the subscriber list holds.
/// </summary>
public class EmailCampaignRecipient
{
    public Guid CampaignId { get; set; }
    public EmailCampaign Campaign { get; set; } = null!;
    public string Email { get; set; } = null!;
    public EmailRecipientStatus Status { get; set; } = EmailRecipientStatus.Pending;
    public int Attempts { get; set; }
    public string? LastError { get; set; }
    public DateTime? SentAt { get; set; }
}
