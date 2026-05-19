namespace JovieJoy.Api.Contracts;

public record WishlistItemDto(string ProductSlug, DateTime AddedAt);
public record WishlistMergeRequest(List<string> ProductSlugs);
