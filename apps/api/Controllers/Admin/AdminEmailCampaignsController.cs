using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/email-campaigns")]
[Authorize(Policy = "AdminOnly")]
public class AdminEmailCampaignsController(
    AppDbContext db,
    EmailCampaignService campaigns,
    IOptions<EmailCampaignOptions> options,
    IWebHostEnvironment environment,
    ILogger<AdminEmailCampaignsController> logger) : ControllerBase
{
    private const string LockedMessage = "This email has already been sent, so it can't be changed.";

    [HttpGet]
    public async Task<ActionResult<EmailCampaignListResponse>> List(CancellationToken ct)
    {
        // The worker also does this every few seconds; doing it here means a product
        // published a moment ago shows up as soon as the page opens.
        await campaigns.SyncDraftsAsync(ct);

        var rows = await db.EmailCampaigns.AsNoTracking()
            .Where(c => c.Status != EmailCampaignStatus.Baseline)
            .Select(c => new
            {
                Campaign = c,
                RecipientCount = c.Recipients.Count,
                SentCount = c.Recipients.Count(r => r.Status == EmailRecipientStatus.Sent),
                FailedCount = c.Recipients.Count(r => r.Status == EmailRecipientStatus.Failed),
            })
            .OrderByDescending(row => row.Campaign.CreatedAt)
            .ToListAsync(ct);

        var items = rows.Select(row => new EmailCampaignListItem(
            row.Campaign.Id, row.Campaign.Kind.ToString(), row.Campaign.ItemSlug, row.Campaign.ItemTitle,
            row.Campaign.Status.ToString(), row.Campaign.Subject,
            row.RecipientCount, row.SentCount, row.FailedCount,
            row.Campaign.CreatedAt, row.Campaign.ApprovedAt, row.Campaign.SentAt)).ToList();

        var audience = await campaigns.ActiveAudienceAsync(ct);
        return Ok(new EmailCampaignListResponse(items, audience.Count));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EmailCampaignDetail>> Get(Guid id, CancellationToken ct)
    {
        var campaign = await FindAsync(id, ct);
        return campaign is null ? NotFound() : Ok(await DetailAsync(campaign, ct));
    }

    [HttpGet("{id:guid}/preview")]
    public async Task<ActionResult<EmailCampaignPreview>> Preview(Guid id, CancellationToken ct)
    {
        var campaign = await FindAsync(id, ct);
        if (campaign is null) return NotFound();
        var rendered = campaigns.Render(campaign, null);
        return Ok(new EmailCampaignPreview(rendered.Subject, campaign.Preheader, rendered.Html, rendered.Text));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<EmailCampaignDetail>> Update(
        Guid id, [FromBody] UpdateEmailCampaignRequest req, CancellationToken ct)
    {
        var campaign = await FindAsync(id, ct);
        if (campaign is null) return NotFound();
        if (campaign.Status != EmailCampaignStatus.Draft) return Conflict(new { error = LockedMessage });
        if (string.IsNullOrWhiteSpace(req.Subject) || string.IsNullOrWhiteSpace(req.Headline) ||
            string.IsNullOrWhiteSpace(req.Body) || string.IsNullOrWhiteSpace(req.ButtonLabel))
            return BadRequest(new { error = "Subject, headline, message and button text are all required." });

        campaign.Subject = req.Subject.Trim();
        campaign.Preheader = req.Preheader?.Trim() ?? "";
        campaign.Headline = req.Headline.Trim();
        campaign.Body = req.Body.Trim();
        campaign.ButtonLabel = req.ButtonLabel.Trim();
        campaign.EditedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(await DetailAsync(campaign, ct));
    }

    [HttpPost("{id:guid}/test")]
    public async Task<IActionResult> SendTest(Guid id, [FromBody] EmailCampaignTestRequest req, CancellationToken ct)
    {
        var campaign = await FindAsync(id, ct);
        if (campaign is null) return NotFound();
        try
        {
            await campaigns.SendTestAsync(campaign, req.To.Trim(), ct);
        }
        catch (Exception exception) when (!ct.IsCancellationRequested)
        {
            logger.LogError(exception, "Test email failed for campaign {CampaignId}", id);
            return StatusCode(StatusCodes.Status502BadGateway, new { error = "The test email couldn't be sent. Check the Resend settings." });
        }
        return Ok(new { ok = true });
    }

    [HttpPost("{id:guid}/send")]
    public async Task<IActionResult> Send(Guid id, CancellationToken ct)
    {
        var campaign = await FindAsync(id, ct);
        if (campaign is null) return NotFound();
        if (string.IsNullOrWhiteSpace(options.Value.PostalAddress) &&
            !environment.IsDevelopment() && !environment.IsEnvironment("Test"))
            return BadRequest(new { error = "Add EmailCampaigns__PostalAddress on the server first. Marketing emails must show a postal address." });
        if (campaign.Status == EmailCampaignStatus.Draft && !await campaigns.IsItemLiveAsync(campaign, ct))
            return BadRequest(new { error = "This item isn't live on the site, so the link in the email wouldn't work." });

        try
        {
            var recipientCount = await campaigns.ApproveAsync(campaign, ct);
            return Ok(new { recipientCount });
        }
        catch (EmailCampaignConflictException exception)
        {
            return Conflict(new { error = exception.Message });
        }
    }

    [HttpPost("{id:guid}/skip")]
    public Task<IActionResult> Skip(Guid id, CancellationToken ct) =>
        MoveAsync(id, EmailCampaignStatus.Draft, EmailCampaignStatus.Skipped, ct);

    [HttpPost("{id:guid}/restore")]
    public Task<IActionResult> Restore(Guid id, CancellationToken ct) =>
        MoveAsync(id, EmailCampaignStatus.Skipped, EmailCampaignStatus.Draft, ct);

    private async Task<IActionResult> MoveAsync(
        Guid id, EmailCampaignStatus from, EmailCampaignStatus to, CancellationToken ct)
    {
        var campaign = await FindAsync(id, ct);
        if (campaign is null) return NotFound();
        if (campaign.Status != from) return Conflict(new { error = LockedMessage });
        campaign.Status = to;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { error = LockedMessage });
        }
        return Ok(await DetailAsync(campaign, ct));
    }

    private Task<EmailCampaign?> FindAsync(Guid id, CancellationToken ct) =>
        db.EmailCampaigns.FirstOrDefaultAsync(c => c.Id == id && c.Status != EmailCampaignStatus.Baseline, ct);

    private async Task<EmailCampaignDetail> DetailAsync(EmailCampaign c, CancellationToken ct)
    {
        var counts = await db.EmailCampaignRecipients.AsNoTracking()
            .Where(r => r.CampaignId == c.Id)
            .GroupBy(r => r.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToDictionaryAsync(row => row.Status, row => row.Count, ct);
        var count = (EmailRecipientStatus status) => counts.GetValueOrDefault(status);
        var audience = await campaigns.ActiveAudienceAsync(ct);

        return new EmailCampaignDetail(
            c.Id, c.Kind.ToString(), c.ItemSlug, c.ItemTitle, c.Status.ToString(),
            c.Subject, c.Preheader, c.Headline, c.Body, c.ButtonLabel, c.ImageUrl, c.PriceLabel,
            await campaigns.IsItemLiveAsync(c, ct), audience.Count,
            counts.Values.Sum(), count(EmailRecipientStatus.Sent), count(EmailRecipientStatus.Failed),
            count(EmailRecipientStatus.Skipped), c.CreatedAt, c.ApprovedAt, c.SentAt);
    }
}
