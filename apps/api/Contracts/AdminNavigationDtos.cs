namespace JovieJoy.Api.Contracts;

public record AdminNavigationItemDto(
    Guid Id,
    Guid? ParentId,
    string Label,
    string Href,
    int SortIndex);

public record AdminNavigationResponse(
    IReadOnlyList<AdminNavigationItemDto> Items,
    string Revision);

public record ReplaceAdminNavigationRequest(
    List<AdminNavigationItemDto> Items,
    string ExpectedRevision);
