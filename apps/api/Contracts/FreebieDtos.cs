using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record FreebieListItemDto(
    string Slug, string Title, string Excerpt, string CoverImage,
    string FileKind, long FileSizeBytes, int SortIndex)
{
    public static FreebieListItemDto From(Freebie f) =>
        new(f.Slug, f.Title, f.Excerpt, f.CoverImage, f.FileKind, f.FileSizeBytes, f.SortIndex);
}

public record FreebieDto(
    string Slug, string Title, string Excerpt, List<string> Description,
    string CoverImage, string FileKind, long FileSizeBytes)
{
    public static FreebieDto From(Freebie f) =>
        new(f.Slug, f.Title, f.Excerpt, f.Description, f.CoverImage, f.FileKind, f.FileSizeBytes);
}

public record FreebieAdminDto(
    Guid Id, string Slug, string Title, string Excerpt, List<string> Description,
    string CoverImage, string FilePath, string FileKind, long FileSizeBytes,
    int SortIndex, bool Published, int RequestCount, DateTime? LastRequestedAt,
    DateTime CreatedAt, DateTime UpdatedAt)
{
    public static FreebieAdminDto From(Freebie f, int requestCount, DateTime? lastRequestedAt) =>
        new(f.Id, f.Slug, f.Title, f.Excerpt, f.Description, f.CoverImage,
            f.FilePath, f.FileKind, f.FileSizeBytes, f.SortIndex, f.Published,
            requestCount, lastRequestedAt, f.CreatedAt, f.UpdatedAt);
}

public record FreebieRequestDto(
    Guid Id, string Email, bool OptedIntoNewsletter, int DownloadCount,
    DateTime? FirstDownloadedAt, DateTime? LastDownloadedAt,
    DateTime ExpiresAt, DateTime CreatedAt);

public record CreateFreebieRequest(string Slug, string Title, string Excerpt, List<string>? Description, bool? Published);
public record UpdateFreebieRequest(string Title, string Excerpt, List<string> Description, bool Published);
public record FreebieRequestCreate(string Email, bool OptIn);
public record FreebieReorderItem(string Slug, int SortIndex);
