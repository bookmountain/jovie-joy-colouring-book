using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/faqs")]
public class FaqsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FaqDto>>> List(CancellationToken ct)
    {
        var faqs = await db.Faqs.AsNoTracking().OrderBy(f => f.SortIndex).ToListAsync(ct);
        return Ok(faqs.Select(FaqDto.From));
    }
}
