namespace JovieJoy.Api.Contracts;

public record AdminPagedResponse<T>(
    IReadOnlyList<T> Items,
    int Total,
    int Page,
    int PageSize);

public record AdminCustomerListItem(
    string Email,
    string? Name,
    bool Registered,
    int OrderCount,
    int LifetimeSpendCents,
    DateTime? LastOrderAt,
    DateTime? JoinedAt);

public record AdminNotifyMeListItem(
    Guid Id,
    string Email,
    string ProductSlug,
    string? ProductTitle,
    DateTime CreatedAt);

public record AdminSubscriberListItem(
    string Email,
    DateTime CreatedAt);
