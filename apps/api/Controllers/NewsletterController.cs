using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/newsletter")]
public class NewsletterController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Subscribe([FromBody] NewsletterSignupRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
            return BadRequest(new { error = "Valid email required" });

        var normalized = req.Email.Trim().ToLower();
        var existing = await db.NewsletterSubscribers
            .Where(s => s.Email.ToLower() == normalized)
            .ToListAsync(ct);
        if (existing.Count == 0)
        {
            db.NewsletterSubscribers.Add(new NewsletterSubscriber { Email = req.Email });
        }
        else
        {
            // Typing an email into the signup form is an explicit request to come back.
            foreach (var subscriber in existing) subscriber.UnsubscribedAt = null;
        }
        await db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }

    /// <summary>
    /// POST only, so link scanners that open every URL in an email can't unsubscribe
    /// people. Used by the /unsubscribe page and by the mail client's one-click button.
    /// </summary>
    [HttpPost("unsubscribe/{token}")]
    public async Task<IActionResult> Unsubscribe(string token, CancellationToken ct)
    {
        var subscriber = await db.NewsletterSubscribers.FirstOrDefaultAsync(s => s.UnsubscribeToken == token, ct);
        if (subscriber is null) return NotFound(new { error = "This unsubscribe link isn't valid." });

        // Cover case variants too, or "Ada@x.com" could keep getting mail after
        // "ada@x.com" opted out.
        var normalized = subscriber.Email.ToLower();
        var variants = await db.NewsletterSubscribers
            .Where(s => s.Email.ToLower() == normalized)
            .ToListAsync(ct);
        var now = DateTime.UtcNow;
        foreach (var variant in variants) variant.UnsubscribedAt ??= now;
        await db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
