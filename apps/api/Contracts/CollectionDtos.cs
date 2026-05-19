using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record CollectionDto(
    Guid Id,
    string Slug,
    string Title,
    string Excerpt,
    string? HeroImage,
    string DefaultSort,
    string? HomepageSlot,
    List<string> ProductSlugs,
    int SortIndex)
{
    public static CollectionDto From(Collection c, IEnumerable<string>? memberSlugs = null) => new(
        c.Id, c.Slug, c.Title, c.Excerpt, c.HeroImage,
        c.DefaultSort.ToString().ToLowerInvariant(),
        c.HomepageSlot?.ToString().ToLowerInvariant(),
        (memberSlugs ?? c.ProductOrder).ToList(),
        c.SortIndex);
}

public record CollectionWithProductsDto(CollectionDto Collection, List<ProductDto> Products);
