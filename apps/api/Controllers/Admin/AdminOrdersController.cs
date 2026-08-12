using JovieJoy.Api.Services;
using JovieJoy.Api.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminOrdersController(IOrderService orders) : ControllerBase
{
    [HttpPost("{id:guid}/resend-downloads")]
    [ManagesCmsMutationLock]
    public async Task<IActionResult> ResendDownloads(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await orders.ResendProductDownloadsAsync(id, ct);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (ProductDownloadDeliveryException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { error = ex.Message });
        }
    }
}
