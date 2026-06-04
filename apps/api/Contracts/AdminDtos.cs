namespace JovieJoy.Api.Contracts;

public record CreateProductRequest(
    string Slug, string Title, string Excerpt, List<string> Description,
    int PriceCents, int? CompareAtPriceCents, bool Available,
    string ProductType, List<string> Images,
    List<Data.Entities.ProductOption>? Options,
    List<Data.Entities.SourceLink>? SourceLinks,
    List<string>? ReviewImages, List<string>? InspirationImages,
    List<string> Tags, List<string> CollectionSlugs,
    DateTime? PublishedAt);

public record UpdateProductRequest(
    string Title, string Excerpt, List<string> Description,
    int PriceCents, int? CompareAtPriceCents, bool Available,
    string ProductType, List<string> Images,
    List<Data.Entities.ProductOption>? Options,
    List<Data.Entities.SourceLink>? SourceLinks,
    List<string>? ReviewImages, List<string>? InspirationImages,
    List<string> Tags, List<string> CollectionSlugs,
    DateTime? PublishedAt);

public record CreateCollectionRequest(
    string Slug, string Title, string Excerpt, string? HeroImage,
    string DefaultSort, string? HomepageSlot,
    List<string> ProductOrder, int SortIndex);

public record UpdateCollectionRequest(
    string Title, string Excerpt, string? HeroImage,
    string DefaultSort, string? HomepageSlot,
    List<string> ProductOrder, int SortIndex);

public record UpsertContentBlockRequest(string Type, System.Text.Json.JsonElement Data, int SortIndex);
public record UploadResponse(string Url);
