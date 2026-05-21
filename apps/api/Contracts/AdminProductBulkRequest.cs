namespace JovieJoy.Api.Contracts;

public record AdminProductBulkRequest(
    List<string> Slugs,
    string Action,                  // "publish" | "unpublish" | "delete" | "add-to-collection" | "remove-from-collection"
    AdminProductBulkPayload? Payload);

public record AdminProductBulkPayload(string? CollectionSlug);
