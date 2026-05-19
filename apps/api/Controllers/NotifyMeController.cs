using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Mvc;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/notify-me")]
public class NotifyMeController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] NotifyMeRequestDto req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
            return BadRequest(new { error = "Valid email required" });
        if (string.IsNullOrWhiteSpace(req.ProductSlug))
            return BadRequest(new { error = "ProductSlug required" });

        db.NotifyMeRequests.Add(new NotifyMeRequest { Email = req.Email, ProductSlug = req.ProductSlug });
        await db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
