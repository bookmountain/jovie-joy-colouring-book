using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record BlogCategoryDto(string Slug, string Title, string Excerpt, string Image, int SortIndex)
{
    public static BlogCategoryDto From(BlogCategory b) => new(b.Slug, b.Title, b.Excerpt, b.Image, b.SortIndex);
}

public record ArticleDto(string Slug, string BlogSlug, string Title, string Excerpt, string Image, List<string> Body)
{
    public static ArticleDto From(Article a) => new(a.Slug, a.BlogSlug, a.Title, a.Excerpt, a.Image, a.Body);
}

public record BlogCategoryWithArticlesDto(BlogCategoryDto Category, List<ArticleDto> Articles);

public record CreateBlogCategoryRequest(string Slug, string Title, string Excerpt, string Image, int SortIndex);
public record UpdateBlogCategoryRequest(string Title, string Excerpt, string Image, int SortIndex);

public record CreateArticleRequest(string Slug, string Title, string Excerpt, string Image, List<string> Body, int SortIndex);
public record UpdateArticleRequest(string Title, string Excerpt, string Image, List<string> Body, int SortIndex);
