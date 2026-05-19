using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JovieJoy.Api.Controllers;

[ApiController]
public class AdminContentController : ControllerBase
{
    [HttpGet("api/content")] public IActionResult GetAll() => Ok(Array.Empty<object>());
}
