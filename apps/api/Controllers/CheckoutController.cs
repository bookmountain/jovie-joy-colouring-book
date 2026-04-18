using System.Security.Claims;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/checkout")]
public class CheckoutController(
    AppDbContext db,
    IOrderService orders,
    IStripeService stripe) : ControllerBase
{
    // Auth is optional here — guests can check out too.
    [HttpPost]
    public async Task<ActionResult<CheckoutResponse>> Create(
        [FromBody] CheckoutRequest req,
        CancellationToken ct)
    {
        Guid? userId = null;
        if (User.Identity?.IsAuthenticated == true)
        {
            var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
            if (Guid.TryParse(sub, out var id)) userId = id;
        }

        try
        {
            var order = await orders.CreatePendingOrderAsync(req, userId, ct);
            var session = await stripe.CreateCheckoutSessionAsync(order, ct);

            order.StripeSessionId = session.Id;
            await db.SaveChangesAsync(ct);

            return Ok(new CheckoutResponse(session.Url, order.Id));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
