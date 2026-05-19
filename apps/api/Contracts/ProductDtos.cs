using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record ProductDto(
    Guid Id,
    string Slug,
    string Title,
    string Excerpt,
    List<string> Description,
    int PriceCents,
    int? CompareAtPriceCents,
    bool Available,
    string ProductType,
    List<string> Images,
    List<ProductOption> Options,
    List<SourceLink>? SourceLinks,
    List<string>? ReviewImages,
    List<string>? InspirationImages,
    List<string> Tags,
    List<string> Collections,
    DateTime PublishedAt,
    string? PdfPath)
{
    public static ProductDto From(Product p, IEnumerable<string>? collectionSlugs = null) => new(
        p.Id, p.Slug, p.Title, p.Excerpt, p.Description,
        p.PriceCents, p.CompareAtPriceCents, p.Available,
        p.ProductType.ToString().ToLowerInvariant(),
        p.Images, p.Options, p.SourceLinks, p.ReviewImages, p.InspirationImages, p.Tags,
        (collectionSlugs ?? p.ProductCollections.Select(pc => pc.Collection.Slug)).ToList(),
        p.PublishedAt, p.PdfPath);
}
