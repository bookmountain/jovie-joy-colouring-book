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

public class ResendEmailSender(HttpClient http, IOptions<ResendOptions> opts, ILogger<ResendEmailSender> log) : IEmailSender
{
    public async Task SendFreebieDownloadAsync(string to, Freebie f, string downloadUrl, CancellationToken ct)
    {
        var subject = $"Your free download — {f.Title}";
        var html = BuildHtml(f, downloadUrl);
        var text = $"Your download link for {f.Title}: {downloadUrl}\nThis link expires in 7 days.";

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

    private static string BuildHtml(Freebie f, string url) => $@"
<!doctype html><html><body style=""font-family:system-ui,sans-serif;color:#222"">
  <h2 style=""margin:0 0 12px 0"">{System.Net.WebUtility.HtmlEncode(f.Title)}</h2>
  <p>Thanks for grabbing this freebie! Click the button below to download.</p>
  <p><a href=""{url}"" style=""display:inline-block;background:#5b3aa8;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none"">Download your file</a></p>
  <p style=""font-size:13px;color:#666"">This link expires in 7 days. If the button doesn't work, copy and paste: <br/>{url}</p>
</body></html>";
}
