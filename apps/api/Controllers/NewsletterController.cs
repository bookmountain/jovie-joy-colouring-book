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

        var existing = await db.NewsletterSubscribers.FirstOrDefaultAsync(s => s.Email == req.Email, ct);
        if (existing is null)
        {
            db.NewsletterSubscribers.Add(new NewsletterSubscriber { Email = req.Email });
            await db.SaveChangesAsync(ct);
        }
        return Ok(new { ok = true });
    }
}
