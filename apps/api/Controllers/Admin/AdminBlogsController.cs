using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/blogs")]
[Authorize(Policy = "AdminOnly")]
public class AdminBlogsController(AppDbContext db, IUploadService uploads) : ControllerBase
{
    // ----- Categories -----

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BlogCategoryDto>>> ListCategories(CancellationToken ct)
    {
        var rows = await db.BlogCategories.AsNoTracking().OrderBy(b => b.SortIndex).ToListAsync(ct);
        return Ok(rows.Select(BlogCategoryDto.From));
    }

    [HttpPost]
    public async Task<ActionResult<BlogCategoryDto>> CreateCategory([FromBody] CreateBlogCategoryRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Slug) || string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { error = "Slug and Title are required" });
        if (await db.BlogCategories.AnyAsync(c => c.Slug == req.Slug, ct))
            return Conflict(new { error = $"Slug '{req.Slug}' already in use" });
        var row = new BlogCategory
        {
            Slug = req.Slug, Title = req.Title, Excerpt = req.Excerpt ?? "",
            Image = req.Image ?? "", SortIndex = req.SortIndex,
        };
        db.BlogCategories.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(BlogCategoryDto.From(row));
    }

    [HttpPut("{slug}")]
    public async Task<ActionResult<BlogCategoryDto>> UpdateCategory(string slug, [FromBody] UpdateBlogCategoryRequest req, CancellationToken ct)
    {
        var row = await db.BlogCategories.FirstOrDefaultAsync(c => c.Slug == slug, ct);
        if (row is null) return NotFound();
        row.Title = req.Title; row.Excerpt = req.Excerpt ?? "";
        row.Image = req.Image ?? ""; row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(BlogCategoryDto.From(row));
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> DeleteCategory(string slug, CancellationToken ct)
    {
        var row = await db.BlogCategories.FirstOrDefaultAsync(c => c.Slug == slug, ct);
        if (row is null) return NotFound();
        db.BlogCategories.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{slug}/image")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> UploadCategoryImage(string slug, IFormFile file, CancellationToken ct)
    {
        try
        {
            var url = await uploads.SaveImageAsync(file, "blogs", slug, ct);
            return Ok(new UploadResponse(url));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    // ----- Articles -----

    [HttpGet("{categorySlug}/articles")]
    public async Task<ActionResult<IEnumerable<ArticleDto>>> ListArticles(string categorySlug, CancellationToken ct)
    {
        var rows = await db.Articles.AsNoTracking()
            .Where(a => a.BlogSlug == categorySlug)
            .OrderBy(a => a.SortIndex)
            .ToListAsync(ct);
        return Ok(rows.Select(ArticleDto.From));
    }

    [HttpPost("{categorySlug}/articles")]
    public async Task<ActionResult<ArticleDto>> CreateArticle(string categorySlug, [FromBody] CreateArticleRequest req, CancellationToken ct)
    {
        if (!await db.BlogCategories.AnyAsync(c => c.Slug == categorySlug, ct))
            return NotFound(new { error = $"Blog category '{categorySlug}' not found" });
        if (string.IsNullOrWhiteSpace(req.Slug) || string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { error = "Slug and Title are required" });
        if (await db.Articles.AnyAsync(a => a.BlogSlug == categorySlug && a.Slug == req.Slug, ct))
            return Conflict(new { error = $"Article slug '{req.Slug}' already exists in '{categorySlug}'" });

        var row = new Article
        {
            Slug = req.Slug, BlogSlug = categorySlug, Title = req.Title,
            Excerpt = req.Excerpt ?? "", Image = req.Image ?? "",
            Body = req.Body ?? new List<string>(), SortIndex = req.SortIndex,
        };
        db.Articles.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(ArticleDto.From(row));
    }

    [HttpPut("{categorySlug}/articles/{articleSlug}")]
    public async Task<ActionResult<ArticleDto>> UpdateArticle(string categorySlug, string articleSlug, [FromBody] UpdateArticleRequest req, CancellationToken ct)
    {
        var row = await db.Articles.FirstOrDefaultAsync(a => a.BlogSlug == categorySlug && a.Slug == articleSlug, ct);
        if (row is null) return NotFound();
        row.Title = req.Title; row.Excerpt = req.Excerpt ?? "";
        row.Image = req.Image ?? ""; row.Body = req.Body ?? new List<string>();
        row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(ArticleDto.From(row));
    }

    [HttpDelete("{categorySlug}/articles/{articleSlug}")]
    public async Task<IActionResult> DeleteArticle(string categorySlug, string articleSlug, CancellationToken ct)
    {
        var row = await db.Articles.FirstOrDefaultAsync(a => a.BlogSlug == categorySlug && a.Slug == articleSlug, ct);
        if (row is null) return NotFound();
        db.Articles.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{categorySlug}/articles/{articleSlug}/image")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<UploadResponse>> UploadArticleImage(string categorySlug, string articleSlug, IFormFile file, CancellationToken ct)
    {
        try
        {
            var url = await uploads.SaveImageAsync(file, $"blogs/{categorySlug}", articleSlug, ct);
            return Ok(new UploadResponse(url));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }
}
