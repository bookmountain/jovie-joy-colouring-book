using Microsoft.AspNetCore.Mvc;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    [HttpGet]                    public IActionResult List() => Ok(Array.Empty<object>());
    [HttpGet("{slug}")]          public IActionResult Get(string slug) => NotFound();
}
