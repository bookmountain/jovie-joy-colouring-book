namespace JovieJoy.Api.Contracts;

public record AdminProductBulkRequest(
    List<string> Slugs,
    string Action,                  // publication, availability, deletion, or collection membership action
    AdminProductBulkPayload? Payload);

public record AdminProductBulkPayload(string? CollectionSlug);

public record AdminProductBulkResponse(int Updated, List<string> Missing);
