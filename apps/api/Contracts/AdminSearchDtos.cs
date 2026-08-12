namespace JovieJoy.Api.Contracts;

public record AdminSearchResultDto(
    string Type,
    string Id,
    string Title,
    string Subtitle,
    string Href);

public record AdminSearchResponse(
    IReadOnlyList<AdminSearchResultDto> Items);
