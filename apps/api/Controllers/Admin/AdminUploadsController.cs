using JovieJoy.Api.Contracts;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/uploads")]
[Authorize(Policy = "AdminOnly")]
public class AdminUploadsController(IUploadService uploads) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> Upload(
        [FromForm] IFormFile file,
        [FromForm] string? folder,
        CancellationToken ct)
    {
        try
        {
            var url = await uploads.SaveImageAsync(file, folder ?? "general", "asset", ct);
            return Ok(new UploadResponse(url));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
