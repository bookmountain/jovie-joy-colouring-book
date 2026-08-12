using System.Net.Http.Headers;
using System.Net.Http.Json;
using JovieJoy.Api.Data.Entities;
using Microsoft.Extensions.Options;

namespace JovieJoy.Api.Services;

public class ResendOptions
{
    public string? ApiKey { get; set; }
    public string FromAddress { get; set; } = "hello@jovie-joy.local";
    public string FromName { get; set; } = "Jovie Joy";
}

public class FreebiesOptions
{
    public int DownloadTtlDays { get; set; } = 7;
    public int MaxFileSizeMb { get; set; } = 15;
    public string BaseUrl { get; set; } = "http://localhost:8080";
}

public class ProductDownloadsOptions
{
    public int DownloadTtlDays { get; set; } = 30;
}

public class ResendEmailSender(
    HttpClient http,
    IOptions<ResendOptions> opts,
    IOptions<FreebiesOptions> freebieOpts,
    IWebHostEnvironment environment,
    ILogger<ResendEmailSender> log) : IEmailSender
{
    public async Task SendFreebieDownloadAsync(string to, Freebie f, string downloadUrl, CancellationToken ct)
    {
        var ttlDays = freebieOpts.Value.DownloadTtlDays;
        var subject = $"Your free download — {f.Title}";
        var html = BuildHtml(f, downloadUrl, ttlDays);
        var text = $"Your download link for {f.Title}: {downloadUrl}\nThis link expires in {ttlDays} days.";

        if (string.IsNullOrWhiteSpace(opts.Value.ApiKey) &&
            !environment.IsDevelopment() &&
            !environment.IsEnvironment("Test"))
            throw new InvalidOperationException("Resend__ApiKey is required to deliver freebie downloads.");

        if (string.IsNullOrWhiteSpace(opts.Value.ApiKey))
        {
            log.LogInformation("[dev-noop email] to={To} subject={Subject} url={Url}", to, subject, downloadUrl);
            return;
        }

        var payload = new
        {
            from = $"{opts.Value.FromName} <{opts.Value.FromAddress}>",
            to = new[] { to },
            subject,
            html,
            text,
        };
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
        {
            Content = JsonContent.Create(payload),
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", opts.Value.ApiKey);
        var resp = await http.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode)
        {
            var body = await resp.Content.ReadAsStringAsync(ct);
            log.LogError("Resend send failed: {Status} {Body}", resp.StatusCode, body);
            throw new InvalidOperationException($"Resend send failed: {resp.StatusCode}");
        }
    }

    public async Task SendProductDownloadsAsync(
        string to,
        string? customerName,
        IReadOnlyList<ProductDownloadEmailItem> downloads,
        CancellationToken ct)
    {
        if (downloads.Count == 0) return;

        var subject = downloads.Count == 1
            ? $"Your download — {downloads[0].Title}"
            : "Your Zoe&Book downloads";
        var greeting = string.IsNullOrWhiteSpace(customerName)
            ? "Thanks for your order!"
            : $"Thanks for your order, {System.Net.WebUtility.HtmlEncode(customerName)}!";
        var items = string.Join("", downloads.Select(download => $"""
          <li style="margin:0 0 16px 0">
            <strong>{System.Net.WebUtility.HtmlEncode(download.Title)}</strong><br/>
            <a href="{System.Net.WebUtility.HtmlEncode(download.DownloadUrl)}">Download your file</a><br/>
            <span style="font-size:13px;color:#666">Link expires {download.ExpiresAtUtc:yyyy-MM-dd} UTC.</span>
          </li>
        """));
        var html = $"""
        <!doctype html><html><body style="font-family:system-ui,sans-serif;color:#222">
          <p>{greeting}</p>
          <ul style="padding-left:20px">{items}</ul>
          <p style="font-size:13px;color:#666">Keep this email private. Each link grants access to a purchased file.</p>
        </body></html>
        """;
        var text = string.Join("\n", new[] { "Thanks for your order!" }.Concat(
            downloads.Select(download =>
                $"{download.Title}: {download.DownloadUrl} (expires {download.ExpiresAtUtc:yyyy-MM-dd} UTC)")));

        if (string.IsNullOrWhiteSpace(opts.Value.ApiKey) &&
            !environment.IsDevelopment() &&
            !environment.IsEnvironment("Test"))
            throw new InvalidOperationException("Resend__ApiKey is required to deliver product downloads.");

        if (string.IsNullOrWhiteSpace(opts.Value.ApiKey))
        {
            log.LogInformation(
                "[dev-noop email] to={To} subject={Subject} downloadCount={DownloadCount}",
                to,
                subject,
                downloads.Count);
            return;
        }

        var payload = new
        {
            from = $"{opts.Value.FromName} <{opts.Value.FromAddress}>",
            to = new[] { to },
            subject,
            html,
            text,
        };
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
        {
            Content = JsonContent.Create(payload),
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", opts.Value.ApiKey);
        var response = await http.SendAsync(req, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            log.LogError("Resend product download email failed: {Status} {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Resend send failed: {response.StatusCode}");
        }
    }

    private static string BuildHtml(Freebie f, string url, int ttlDays) => $@"
<!doctype html><html><body style=""font-family:system-ui,sans-serif;color:#222"">
  <h2 style=""margin:0 0 12px 0"">{System.Net.WebUtility.HtmlEncode(f.Title)}</h2>
  <p>Thanks for grabbing this freebie! Click the button below to download.</p>
  <p><a href=""{url}"" style=""display:inline-block;background:#5b3aa8;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none"">Download your file</a></p>
  <p style=""font-size:13px;color:#666"">This link expires in {ttlDays} days. If the button doesn't work, copy and paste: <br/>{url}</p>
</body></html>";
}
