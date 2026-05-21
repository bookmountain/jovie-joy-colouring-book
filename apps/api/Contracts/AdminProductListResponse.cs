namespace JovieJoy.Api.Contracts;

public record AdminProductListResponse(
    IReadOnlyList<AdminProductListItem> Items,
    int Total,
    int Page,
    int PageSize);

public record AdminProductListItem(
    string Slug,
    string Title,
    string Excerpt,
    int PriceCents,
    int? CompareAtPriceCents,
    bool Available,
    string ProductType,
    string Status,                     // derived: published | draft | scheduled | out_of_stock
    IReadOnlyList<string> Tags,
    IReadOnlyList<string> CollectionSlugs,
    string? PrimaryImage,
    DateTime? PublishedAt,
    DateTime UpdatedAt);
