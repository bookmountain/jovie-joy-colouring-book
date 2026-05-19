using System.Security.Claims;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/checkout")]
public class CheckoutController(IOrderService orders) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<CheckoutResponse>> Create([FromBody] CheckoutRequest req, CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = userIdClaim is null ? null : Guid.Parse(userIdClaim);

        try
        {
            var (order, session) = await orders.CreateAsync(req, userId, ct);
            return Ok(new CheckoutResponse(session.Url, order.Id));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
