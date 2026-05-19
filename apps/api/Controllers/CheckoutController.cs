using Microsoft.AspNetCore.Mvc;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/checkout")]
public class CheckoutController : ControllerBase
{
    // Auth is optional here — guests can check out too.
    [HttpPost]
    public IActionResult Create()
    {
        return BadRequest(new { error = "Checkout rewritten in Task 30" });
    }
}
