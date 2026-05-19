using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/blogs")]
public class BlogsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BlogCategoryDto>>> List(CancellationToken ct)
    {
        var cats = await db.BlogCategories.AsNoTracking().OrderBy(c => c.SortIndex).ToListAsync(ct);
        return Ok(cats.Select(BlogCategoryDto.From));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<BlogCategoryWithArticlesDto>> Get(string slug, CancellationToken ct)
    {
        var cat = await db.BlogCategories.AsNoTracking()
            .Include(c => c.Articles)
            .FirstOrDefaultAsync(c => c.Slug == slug, ct);
        if (cat is null) return NotFound();
        return Ok(new BlogCategoryWithArticlesDto(
            BlogCategoryDto.From(cat),
            cat.Articles.OrderBy(a => a.SortIndex).Select(ArticleDto.From).ToList()));
    }

    [HttpGet("{slug}/articles/{articleSlug}")]
    public async Task<ActionResult<ArticleDto>> GetArticle(string slug, string articleSlug, CancellationToken ct)
    {
        var article = await db.Articles.AsNoTracking()
            .FirstOrDefaultAsync(a => a.BlogSlug == slug && a.Slug == articleSlug, ct);
        return article is null ? NotFound() : Ok(ArticleDto.From(article));
    }
}
