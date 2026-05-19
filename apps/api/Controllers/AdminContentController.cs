using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Authorize(Policy = "AdminOnly")]
public class AdminContentController : ControllerBase
{
    // Admin endpoints are implemented in Task 33.
}
