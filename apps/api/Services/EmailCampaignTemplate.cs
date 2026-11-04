using System.Text;
using JovieJoy.Api.Data.Entities;
using static System.Net.WebUtility;

namespace JovieJoy.Api.Services;

public sealed record RenderedCampaignEmail(string Subject, string Html, string Text);

public sealed record CampaignRenderLinks(
    string ItemUrl,
    string ImageUrl,
    string UnsubscribeUrl,
    string SiteUrl,
    string PostalAddress);

/// <summary>
/// The marketing email layout. Table-based with inline styles because that is what
/// Gmail and Outlook reliably render. All admin text is encoded, never treated as HTML.
/// </summary>
public static class EmailCampaignTemplate
{
    private const string Brand = "Zoe&Book";
    private const string Cream = "#fffaf7";
    private const string Ink = "#322f37";
    private const string Text = "#3c3c3c";
    private const string Muted = "#8a8590";
    private const string Line = "#f1e7e1";
    private const string Coral = "#e9514b";
    private const string Purple = "#816bc1";
    private const string FontStack = "'Helvetica Neue',Helvetica,Arial,sans-serif";

    public static RenderedCampaignEmail Render(EmailCampaign campaign, CampaignRenderLinks links) =>
        new(campaign.Subject, BuildHtml(campaign, links), BuildText(campaign, links));

    private static IEnumerable<string> Paragraphs(string body) =>
        body.Replace("\r\n", "\n")
            .Split("\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static string BuildHtml(EmailCampaign c, CampaignRenderLinks links)
    {
        var itemUrl = HtmlEncode(links.ItemUrl);
        var unsubscribeUrl = HtmlEncode(links.UnsubscribeUrl);
        var siteUrl = HtmlEncode(links.SiteUrl);
        var paragraphs = new StringBuilder();
        foreach (var paragraph in Paragraphs(c.Body))
        {
            var lines = string.Join("<br/>", paragraph.Split('\n').Select(HtmlEncode));
            paragraphs.Append(
                $"""<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:{Text}">{lines}</p>""");
        }

        var image = string.IsNullOrWhiteSpace(links.ImageUrl) ? "" : $"""
          <tr><td style="padding:0">
            <a href="{itemUrl}"><img src="{HtmlEncode(links.ImageUrl)}" width="600" alt="{HtmlEncode(c.Headline)}"
              style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:20px 20px 0 0"/></a>
          </td></tr>
        """;
        var price = string.IsNullOrWhiteSpace(c.PriceLabel) ? "" : $"""
          <p style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:{Purple}">{HtmlEncode(c.PriceLabel)}</p>
        """;
        var postal = string.IsNullOrWhiteSpace(links.PostalAddress) ? "" : $"""
          <p style="margin:0 0 8px 0">{HtmlEncode(links.PostalAddress)}</p>
        """;

        return $"""
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width,initial-scale=1"/>
          <meta name="x-apple-disable-message-reformatting"/>
          <title>{HtmlEncode(c.Subject)}</title>
        </head>
        <body style="margin:0;padding:0;background:{Cream};font-family:{FontStack}">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0">{HtmlEncode(c.Preheader)}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{Cream}">
            <tr><td align="center" style="padding:24px 12px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
                <tr><td align="center" style="padding:8px 0 20px 0">
                  <a href="{siteUrl}" style="font-size:24px;font-weight:800;color:{Ink};text-decoration:none">{HtmlEncode(Brand)}</a>
                </td></tr>
                <tr><td>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                    style="background:#ffffff;border:1px solid {Line};border-radius:20px">
                    {image}
                    <tr><td style="padding:28px 28px 32px 28px">
                      <h1 style="margin:0 0 12px 0;font-size:26px;line-height:1.25;font-weight:800;color:{Ink}">{HtmlEncode(c.Headline)}</h1>
                      {price}
                      {paragraphs}
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px"><tr>
                        <td align="center" style="background:{Coral};border-radius:999px">
                          <a href="{itemUrl}" style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:800;color:#ffffff;text-decoration:none">{HtmlEncode(c.ButtonLabel)}</a>
                        </td>
                      </tr></table>
                    </td></tr>
                  </table>
                </td></tr>
                <tr><td align="center" style="padding:20px 16px 8px 16px;font-size:13px;line-height:1.5;color:{Muted}">
                  <p style="margin:0 0 8px 0">You're getting this because you asked for {HtmlEncode(Brand)} news and freebies.</p>
                  {postal}
                  <p style="margin:0"><a href="{unsubscribeUrl}" style="color:{Muted};text-decoration:underline">Unsubscribe</a></p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;
    }

    private static string BuildText(EmailCampaign c, CampaignRenderLinks links)
    {
        var text = new StringBuilder();
        text.AppendLine(c.Headline);
        if (!string.IsNullOrWhiteSpace(c.PriceLabel)) text.AppendLine(c.PriceLabel);
        text.AppendLine();
        foreach (var paragraph in Paragraphs(c.Body))
        {
            text.AppendLine(paragraph);
            text.AppendLine();
        }
        text.AppendLine($"{c.ButtonLabel}: {links.ItemUrl}");
        text.AppendLine();
        text.AppendLine("--");
        text.AppendLine($"You're getting this because you asked for {Brand} news and freebies.");
        if (!string.IsNullOrWhiteSpace(links.PostalAddress)) text.AppendLine(links.PostalAddress);
        text.AppendLine($"Unsubscribe: {links.UnsubscribeUrl}");
        return text.ToString();
    }
}
