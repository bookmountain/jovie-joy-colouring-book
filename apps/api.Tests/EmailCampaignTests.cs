using System.Net;
using System.Net.Http.Json;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace JovieJoy.Api.Tests;

// Each test gets a fresh factory: audiences and drafts are global, so sharing one
// database between tests would make the recipient assertions order-dependent.
public class EmailCampaignTests : IDisposable
{
    private readonly ApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private async Task WithDb(Func<AppDbContext, Task> work)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        await work(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    private async Task<T> WithDb<T>(Func<AppDbContext, Task<T>> work)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        return await work(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    private async Task Tick(bool sync = true, bool dispatch = true)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<EmailCampaignService>();
        if (sync) await service.SyncDraftsAsync(CancellationToken.None);
        if (dispatch) await service.DispatchAsync(CancellationToken.None);
    }

    private static Product NewProduct(string title = "Moon Book", DateTime? publishedAt = null) => new()
    {
        Slug = $"moon-{Guid.NewGuid():N}",
        Title = title,
        Excerpt = "Dreamy night scenes.",
        PriceCents = 1299,
        ProductType = ProductType.Physical,
        Images = ["/uploads/moon.png"],
        PublishedAt = publishedAt ?? DateTime.UtcNow.AddMinutes(-1),
    };

    private async Task<Product> SeedProduct(Product? product = null)
    {
        product ??= NewProduct();
        await WithDb(async db => { db.Products.Add(product); await db.SaveChangesAsync(); });
        return product;
    }

    private Task SeedSubscribers(params string[] emails) => WithDb(async db =>
    {
        db.NewsletterSubscribers.AddRange(emails.Select(email => new NewsletterSubscriber { Email = email }));
        await db.SaveChangesAsync();
    });

    private Task<List<EmailCampaign>> Campaigns() =>
        WithDb(db => db.EmailCampaigns.AsNoTracking().ToListAsync());

    [Fact]
    public async Task Publishing_creates_a_draft_and_nothing_is_sent_without_approval()
    {
        await SeedSubscribers("ada@example.com");
        var product = await SeedProduct();

        await Tick();

        var campaign = Assert.Single(await Campaigns());
        Assert.Equal(EmailCampaignStatus.Draft, campaign.Status);
        Assert.Equal(product.Id, campaign.ItemId);
        Assert.Contains(product.Title, campaign.Subject);
        Assert.Equal("$12.99 USD", campaign.PriceLabel);
        Assert.Empty(_factory.Emails.CampaignAttempts);
    }

    [Fact]
    public async Task Editing_unpublishing_and_republishing_never_creates_a_second_campaign()
    {
        var product = await SeedProduct();
        await Tick();

        await WithDb(async db =>
        {
            var row = await db.Products.SingleAsync(p => p.Id == product.Id);
            row.Title = "Moon Book Deluxe";
            await db.SaveChangesAsync();
        });
        await Tick();
        await WithDb(async db =>
        {
            (await db.Products.SingleAsync(p => p.Id == product.Id)).PublishedAt = null;
            await db.SaveChangesAsync();
        });
        await Tick();
        await WithDb(async db =>
        {
            (await db.Products.SingleAsync(p => p.Id == product.Id)).PublishedAt = DateTime.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        });
        await Tick();

        Assert.Single(await Campaigns());
    }

    [Fact]
    public async Task A_sent_item_can_never_go_out_again_even_after_it_is_edited()
    {
        await SeedSubscribers("ada@example.com");
        var product = await SeedProduct();
        await Tick();
        var client = await _factory.CreateAdminClientAsync();
        var id = Assert.Single(await Campaigns()).Id;

        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/admin/email-campaigns/{id}/send", null)).StatusCode);
        await Tick();
        Assert.Equal(EmailCampaignStatus.Sent, Assert.Single(await Campaigns()).Status);

        var again = await client.PostAsync($"/api/admin/email-campaigns/{id}/send", null);
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);

        await WithDb(async db =>
        {
            (await db.Products.SingleAsync(p => p.Id == product.Id)).Title = "Edited after sending";
            await db.SaveChangesAsync();
        });
        await Tick();

        var campaign = Assert.Single(await Campaigns());
        Assert.Equal(EmailCampaignStatus.Sent, campaign.Status);
        Assert.DoesNotContain("Edited after sending", campaign.Subject);
        Assert.Single(_factory.Emails.CampaignEmails);
    }

    [Fact]
    public async Task Sent_and_sending_campaigns_are_locked_against_edits()
    {
        await SeedSubscribers("ada@example.com");
        await SeedProduct();
        await Tick();
        var client = await _factory.CreateAdminClientAsync();
        var id = Assert.Single(await Campaigns()).Id;
        await client.PostAsync($"/api/admin/email-campaigns/{id}/send", null);

        var edit = await client.PutAsJsonAsync($"/api/admin/email-campaigns/{id}",
            new UpdateEmailCampaignRequest("New", "", "New", "New", "New"));
        var skip = await client.PostAsync($"/api/admin/email-campaigns/{id}/skip", null);

        Assert.Equal(HttpStatusCode.Conflict, edit.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, skip.StatusCode);
    }

    [Fact]
    public async Task Two_simultaneous_approvals_cannot_both_win()
    {
        await SeedSubscribers("ada@example.com");
        await SeedProduct();
        await Tick();
        var id = Assert.Single(await Campaigns()).Id;

        await using var first = _factory.Services.CreateAsyncScope();
        await using var second = _factory.Services.CreateAsyncScope();
        var firstDb = first.ServiceProvider.GetRequiredService<AppDbContext>();
        var secondDb = second.ServiceProvider.GetRequiredService<AppDbContext>();
        var firstCopy = await firstDb.EmailCampaigns.SingleAsync(c => c.Id == id);
        var secondCopy = await secondDb.EmailCampaigns.SingleAsync(c => c.Id == id);

        await first.ServiceProvider.GetRequiredService<EmailCampaignService>().ApproveAsync(firstCopy, CancellationToken.None);
        // Postgres reports EmailCampaignConflictException here. The in-memory provider
        // trips on the duplicate recipient key first; either way the loser is rejected.
        await Assert.ThrowsAnyAsync<Exception>(() =>
            second.ServiceProvider.GetRequiredService<EmailCampaignService>().ApproveAsync(secondCopy, CancellationToken.None));

        await Tick(sync: false);
        Assert.Single(_factory.Emails.CampaignEmails);
    }

    [Fact]
    public async Task Audience_is_subscribers_only_deduped_by_case_and_excludes_unsubscribed()
    {
        await SeedSubscribers("ada@example.com", "ADA@example.com", "bea@example.com", "gone@example.com");
        await WithDb(async db =>
        {
            (await db.NewsletterSubscribers.SingleAsync(s => s.Email == "gone@example.com")).UnsubscribedAt = DateTime.UtcNow;
            // Downloaded a freebie but did not tick the box, so never a subscriber.
            var freebie = new Freebie { Slug = "f", Title = "F", Excerpt = "", FilePath = "/uploads/f.pdf" };
            db.Freebies.Add(freebie);
            db.FreebieRequests.Add(new FreebieRequest
            {
                FreebieId = freebie.Id, Email = "noconsent@example.com", Token = "t",
                ExpiresAt = DateTime.UtcNow.AddDays(1), OptedIntoNewsletter = false,
            });
            await db.SaveChangesAsync();
        });
        await SeedProduct();
        await Tick();
        var client = await _factory.CreateAdminClientAsync();

        var id = (await Campaigns()).First(c => c.Kind == EmailCampaignKind.Product).Id;
        await client.PostAsync($"/api/admin/email-campaigns/{id}/send", null);
        await Tick(sync: false);

        var sentTo = _factory.Emails.CampaignEmails.Select(e => e.Message.To).Order().ToList();
        Assert.Equal(["ada@example.com", "bea@example.com"], sentTo);
    }

    [Fact]
    public async Task Someone_who_unsubscribes_mid_send_is_skipped()
    {
        await SeedSubscribers("ada@example.com", "bea@example.com");
        await SeedProduct();
        await Tick();
        var client = await _factory.CreateAdminClientAsync();
        var id = Assert.Single(await Campaigns()).Id;
        await client.PostAsync($"/api/admin/email-campaigns/{id}/send", null);

        var token = await WithDb(db => db.NewsletterSubscribers
            .Where(s => s.Email == "ada@example.com").Select(s => s.UnsubscribeToken).SingleAsync());
        await _factory.CreateClient().PostAsync($"/api/newsletter/unsubscribe/{token}", null);
        await Tick(sync: false);

        Assert.Equal("bea@example.com", Assert.Single(_factory.Emails.CampaignEmails).Message.To);
        Assert.Equal(EmailCampaignStatus.Sent, Assert.Single(await Campaigns()).Status);
    }

    [Fact]
    public async Task Failed_sends_retry_with_the_same_key_and_a_dead_address_does_not_block_others()
    {
        await SeedSubscribers("bad@example.com", "good@example.com");
        await SeedProduct();
        await Tick();
        var client = await _factory.CreateAdminClientAsync();
        var id = Assert.Single(await Campaigns()).Id;
        await client.PostAsync($"/api/admin/email-campaigns/{id}/send", null);

        _factory.Emails.CampaignFailure = message =>
            message.To == "bad@example.com" ? new InvalidOperationException("boom") : null;
        for (var attempt = 0; attempt < 5; attempt++) await Tick(sync: false);

        Assert.Equal("good@example.com", Assert.Single(_factory.Emails.CampaignEmails).Message.To);
        var badKeys = _factory.Emails.CampaignAttempts
            .Where(a => a.Message.To == "bad@example.com").Select(a => a.IdempotencyKey).ToList();
        Assert.Equal(5, badKeys.Count);
        Assert.Single(badKeys.Distinct());
        Assert.NotNull(badKeys[0]);

        var campaign = Assert.Single(await Campaigns());
        Assert.Equal(EmailCampaignStatus.Sent, campaign.Status);
        var failed = await WithDb(db => db.EmailCampaignRecipients.SingleAsync(r => r.Email == "bad@example.com"));
        Assert.Equal(EmailRecipientStatus.Failed, failed.Status);
    }

    [Fact]
    public async Task Rate_limit_pauses_without_burning_attempts_and_resumes()
    {
        await SeedSubscribers("ada@example.com", "bea@example.com");
        await SeedProduct();
        await Tick();
        var client = await _factory.CreateAdminClientAsync();
        var id = Assert.Single(await Campaigns()).Id;
        await client.PostAsync($"/api/admin/email-campaigns/{id}/send", null);

        _factory.Emails.CampaignFailure = _ => new EmailRateLimitedException("slow down");
        await Tick(sync: false);
        Assert.Equal(EmailCampaignStatus.Sending, Assert.Single(await Campaigns()).Status);
        Assert.Single(_factory.Emails.CampaignAttempts);

        _factory.Emails.CampaignFailure = null;
        await Tick(sync: false);

        Assert.Equal(2, _factory.Emails.CampaignEmails.Count);
        Assert.Equal(EmailCampaignStatus.Sent, Assert.Single(await Campaigns()).Status);
        Assert.All(await WithDb(db => db.EmailCampaignRecipients.ToListAsync()), r => Assert.Equal(0, r.Attempts));
    }

    [Fact]
    public async Task A_timeout_counts_as_a_failed_attempt_and_does_not_stop_the_worker()
    {
        await SeedSubscribers("ada@example.com");
        await SeedProduct();
        await Tick();
        var client = await _factory.CreateAdminClientAsync();
        var id = Assert.Single(await Campaigns()).Id;
        await client.PostAsync($"/api/admin/email-campaigns/{id}/send", null);

        // This is how HttpClient reports a timeout: cancelled, but not by our token.
        _factory.Emails.CampaignFailure = _ => new TaskCanceledException("timed out");
        await Tick(sync: false);

        var recipient = await WithDb(db => db.EmailCampaignRecipients.SingleAsync());
        Assert.Equal(1, recipient.Attempts);
        Assert.Equal(EmailRecipientStatus.Pending, recipient.Status);
    }

    [Fact]
    public async Task Each_email_carries_that_persons_unsubscribe_link_and_one_click_header()
    {
        await SeedSubscribers("ada@example.com");
        await SeedProduct();
        await Tick();
        var client = await _factory.CreateAdminClientAsync();
        await client.PostAsync($"/api/admin/email-campaigns/{Assert.Single(await Campaigns()).Id}/send", null);
        await Tick(sync: false);

        var token = await WithDb(db => db.NewsletterSubscribers.Select(s => s.UnsubscribeToken).SingleAsync());
        var message = Assert.Single(_factory.Emails.CampaignEmails).Message;
        Assert.Contains($"/unsubscribe?token={Uri.EscapeDataString(token)}", message.Html);
        Assert.EndsWith($"/api/newsletter/unsubscribe/{Uri.EscapeDataString(token)}", message.OneClickUnsubscribeUrl);
        Assert.Contains("1 Test Lane, Testville", message.Html);
        Assert.Contains("1 Test Lane, Testville", message.Text);
    }

    [Fact]
    public async Task Admin_edits_are_kept_but_untouched_drafts_follow_the_item()
    {
        var edited = await SeedProduct(NewProduct("Edited one"));
        var untouched = await SeedProduct(NewProduct("Untouched one"));
        await Tick();
        var client = await _factory.CreateAdminClientAsync();
        var editedId = (await Campaigns()).Single(c => c.ItemId == edited.Id).Id;
        var put = await client.PutAsJsonAsync($"/api/admin/email-campaigns/{editedId}",
            new UpdateEmailCampaignRequest("My subject", "Peek", "My headline", "My body", "Buy"));
        put.EnsureSuccessStatusCode();

        await WithDb(async db =>
        {
            foreach (var row in await db.Products.ToListAsync()) row.Title += " v2";
            await db.SaveChangesAsync();
        });
        await Tick();

        var campaigns = await Campaigns();
        Assert.Equal("My subject", campaigns.Single(c => c.ItemId == edited.Id).Subject);
        Assert.Contains("Untouched one v2", campaigns.Single(c => c.ItemId == untouched.Id).Subject);
    }

    [Fact]
    public async Task Test_send_goes_to_one_address_only_and_does_not_approve_the_draft()
    {
        await SeedSubscribers("ada@example.com");
        await SeedProduct();
        await Tick();
        var client = await _factory.CreateAdminClientAsync();
        var id = Assert.Single(await Campaigns()).Id;

        var response = await client.PostAsJsonAsync(
            $"/api/admin/email-campaigns/{id}/test", new EmailCampaignTestRequest("jovie@example.com"));

        response.EnsureSuccessStatusCode();
        var message = Assert.Single(_factory.Emails.CampaignEmails).Message;
        Assert.Equal("jovie@example.com", message.To);
        Assert.StartsWith("[Test] ", message.Subject);
        Assert.Equal(EmailCampaignStatus.Draft, Assert.Single(await Campaigns()).Status);
        Assert.Empty(await WithDb(db => db.EmailCampaignRecipients.ToListAsync()));
    }

    [Fact]
    public async Task Send_is_refused_when_the_item_is_not_live_or_nobody_is_subscribed()
    {
        var product = await SeedProduct();
        await Tick();
        var client = await _factory.CreateAdminClientAsync();
        var id = Assert.Single(await Campaigns()).Id;

        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync($"/api/admin/email-campaigns/{id}/send", null)).StatusCode);

        await SeedSubscribers("ada@example.com");
        await WithDb(async db =>
        {
            (await db.Products.SingleAsync(p => p.Id == product.Id)).PublishedAt = null;
            await db.SaveChangesAsync();
        });
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync($"/api/admin/email-campaigns/{id}/send", null)).StatusCode);
        Assert.Empty(_factory.Emails.CampaignAttempts);
    }

    [Fact]
    public async Task Scheduled_products_get_a_draft_only_once_they_go_live()
    {
        var product = await SeedProduct(NewProduct(publishedAt: DateTime.UtcNow.AddDays(3)));
        await Tick();
        Assert.Empty(await Campaigns());

        await WithDb(async db =>
        {
            (await db.Products.SingleAsync(p => p.Id == product.Id)).PublishedAt = DateTime.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        });
        await Tick();
        Assert.Single(await Campaigns());
    }

    [Fact]
    public async Task Freebies_need_a_file_and_publish_before_a_draft_appears()
    {
        var freebie = new Freebie { Slug = "cats", Title = "Cats", Excerpt = "Cute", Published = false, FilePath = "/uploads/c.pdf" };
        await WithDb(async db => { db.Freebies.Add(freebie); await db.SaveChangesAsync(); });
        await Tick();
        Assert.Empty(await Campaigns());

        await WithDb(async db =>
        {
            (await db.Freebies.SingleAsync()).Published = true;
            await db.SaveChangesAsync();
        });
        await Tick();

        var campaign = Assert.Single(await Campaigns());
        Assert.Equal(EmailCampaignKind.Freebie, campaign.Kind);
        Assert.Null(campaign.PriceLabel);
    }

    [Fact]
    public async Task Baseline_items_stay_hidden_and_unsendable()
    {
        var product = await SeedProduct();
        var id = Guid.NewGuid();
        await WithDb(async db =>
        {
            db.EmailCampaigns.Add(new EmailCampaign
            {
                Id = id, Kind = EmailCampaignKind.Product, ItemId = product.Id, ItemSlug = product.Slug,
                ItemTitle = product.Title, Status = EmailCampaignStatus.Baseline,
                Subject = "x", Headline = "x", Body = "", ButtonLabel = "",
            });
            await db.SaveChangesAsync();
        });
        var client = await _factory.CreateAdminClientAsync();

        var list = await client.GetFromJsonAsync<EmailCampaignListResponse>("/api/admin/email-campaigns");

        Assert.Empty(list!.Items);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync($"/api/admin/email-campaigns/{id}/send", null)).StatusCode);
    }

    [Fact]
    public async Task Skipped_drafts_can_be_restored()
    {
        await SeedProduct();
        await Tick();
        var client = await _factory.CreateAdminClientAsync();
        var id = Assert.Single(await Campaigns()).Id;

        (await client.PostAsync($"/api/admin/email-campaigns/{id}/skip", null)).EnsureSuccessStatusCode();
        Assert.Equal(EmailCampaignStatus.Skipped, Assert.Single(await Campaigns()).Status);
        await Tick();
        Assert.Equal(EmailCampaignStatus.Skipped, Assert.Single(await Campaigns()).Status);

        (await client.PostAsync($"/api/admin/email-campaigns/{id}/restore", null)).EnsureSuccessStatusCode();
        Assert.Equal(EmailCampaignStatus.Draft, Assert.Single(await Campaigns()).Status);
    }

    [Fact]
    public async Task Admin_endpoints_require_an_admin()
    {
        var response = await _factory.CreateClient().GetAsync("/api/admin/email-campaigns");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Unsubscribe_is_post_only_covers_case_variants_and_rejects_bad_tokens()
    {
        await SeedSubscribers("ada@example.com", "ADA@example.com");
        var token = await WithDb(db => db.NewsletterSubscribers
            .Where(s => s.Email == "ada@example.com").Select(s => s.UnsubscribeToken).SingleAsync());
        var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await client.GetAsync($"/api/newsletter/unsubscribe/{token}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync("/api/newsletter/unsubscribe/nope", null)).StatusCode);

        // RFC 8058 clients post this form body.
        var form = new FormUrlEncodedContent(new Dictionary<string, string> { ["List-Unsubscribe"] = "One-Click" });
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/newsletter/unsubscribe/{token}", form)).StatusCode);

        Assert.All(await WithDb(db => db.NewsletterSubscribers.ToListAsync()), s => Assert.NotNull(s.UnsubscribedAt));
    }

    [Fact]
    public async Task Freebie_download_does_not_undo_an_unsubscribe_but_the_signup_form_does()
    {
        await WithDb(async db =>
        {
            db.NewsletterSubscribers.Add(new NewsletterSubscriber { Email = "ada@example.com", UnsubscribedAt = DateTime.UtcNow });
            db.Freebies.Add(new Freebie { Slug = "cats", Title = "Cats", Excerpt = "", Published = true, FilePath = "/uploads/c.pdf" });
            await db.SaveChangesAsync();
        });
        var client = _factory.CreateClient();

        var freebie = await client.PostAsJsonAsync("/api/freebies/cats/request", new FreebieRequestCreate("ADA@example.com", true));
        freebie.EnsureSuccessStatusCode();
        var row = Assert.Single(await WithDb(db => db.NewsletterSubscribers.ToListAsync()));
        Assert.NotNull(row.UnsubscribedAt);

        var signup = await client.PostAsJsonAsync("/api/newsletter", new NewsletterSignupRequest("ada@example.com"));
        signup.EnsureSuccessStatusCode();
        row = Assert.Single(await WithDb(db => db.NewsletterSubscribers.ToListAsync()));
        Assert.Null(row.UnsubscribedAt);
    }

    [Fact]
    public void Template_encodes_admin_text_and_includes_the_required_footer()
    {
        var campaign = new EmailCampaign
        {
            Subject = "Hello & welcome",
            Preheader = "Peek",
            Headline = "<script>alert(1)</script>",
            Body = "Line one\nLine two\n\nSecond <b>para</b>",
            ButtonLabel = "Shop",
            PriceLabel = "$5.00 USD",
        };

        var rendered = EmailCampaignTemplate.Render(campaign, new CampaignRenderLinks(
            "https://site.test/products/a?x=1&y=2", "https://api.test/uploads/a.png",
            "https://site.test/unsubscribe?token=abc", "https://site.test", "1 Lane"));

        Assert.DoesNotContain("<script>", rendered.Html);
        Assert.Contains("&lt;script&gt;", rendered.Html);
        Assert.DoesNotContain("<b>para", rendered.Html);
        Assert.Contains("Line one<br/>Line two", rendered.Html);
        Assert.Contains("x=1&amp;y=2", rendered.Html);
        Assert.Contains("Unsubscribe", rendered.Html);
        Assert.Contains("Unsubscribe: https://site.test/unsubscribe?token=abc", rendered.Text);
        Assert.Contains("1 Lane", rendered.Text);
    }

    [Fact]
    public async Task Resend_sender_posts_idempotency_key_and_one_click_headers()
    {
        var handler = new CapturingHandler();
        var sender = new ResendEmailSender(
            new HttpClient(handler),
            Options.Create(new ResendOptions { ApiKey = "re_test", FromAddress = "hi@example.com", FromName = "Zoe" }),
            Options.Create(new FreebiesOptions()),
            new FakeEnvironment(),
            NullLogger<ResendEmailSender>.Instance);

        await sender.SendCampaignEmailAsync(
            new CampaignEmailMessage("a@example.com", "Hi", "<p>Hi</p>", "Hi", "https://api.test/unsub/1", "reply@example.com"),
            "key-1",
            CancellationToken.None);

        Assert.Equal("key-1", handler.Request!.Headers.GetValues("Idempotency-Key").Single());
        Assert.Contains("\"List-Unsubscribe\":\"\\u003Chttps://api.test/unsub/1\\u003E\"", handler.Body);
        Assert.Contains("\"List-Unsubscribe-Post\":\"List-Unsubscribe=One-Click\"", handler.Body);
        Assert.Contains("\"reply_to\":\"reply@example.com\"", handler.Body);

        handler.Status = HttpStatusCode.TooManyRequests;
        await Assert.ThrowsAsync<EmailRateLimitedException>(() => sender.SendCampaignEmailAsync(
            new CampaignEmailMessage("a@example.com", "Hi", "<p>Hi</p>", "Hi", null, null), null, CancellationToken.None));
    }

    private sealed class CapturingHandler : HttpMessageHandler
    {
        public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;
        public HttpRequestMessage? Request { get; private set; }
        public string Body { get; private set; } = "";

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Request = request;
            Body = await request.Content!.ReadAsStringAsync(ct);
            return new HttpResponseMessage(Status) { Content = new StringContent("{}") };
        }
    }

    private sealed class FakeEnvironment : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Test";
        public string ApplicationName { get; set; } = "tests";
        public string WebRootPath { get; set; } = "";
        public Microsoft.Extensions.FileProviders.IFileProvider WebRootFileProvider { get; set; } = null!;
        public string ContentRootPath { get; set; } = "";
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}
