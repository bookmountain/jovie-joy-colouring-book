namespace JovieJoy.Api.Services;

public interface IUploadService
{
    Task<string> SaveImageAsync(IFormFile file, string subfolder, string filePrefix, CancellationToken ct);
    void DeleteIfLocal(string? url);
}

public class UploadService(IWebHostEnvironment env) : IUploadService
{
    private static readonly string[] AllowedImageTypes =
        ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

    public async Task<string> SaveImageAsync(IFormFile file, string subfolder, string filePrefix, CancellationToken ct)
    {
        if (!AllowedImageTypes.Contains(file.ContentType))
            throw new InvalidOperationException("Only JPEG, PNG, WebP, GIF, or SVG images are accepted");

        var dir = Path.Combine(env.ContentRootPath, "uploads", subfolder);
        Directory.CreateDirectory(dir);

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext)) ext = ".bin";
        var fileName = $"{filePrefix}_{Path.GetRandomFileName()}{ext}";
        var filePath = Path.Combine(dir, fileName);

        await using (var stream = File.Create(filePath))
            await file.CopyToAsync(stream, ct);

        return $"/uploads/{subfolder}/{fileName}";
    }

    public void DeleteIfLocal(string? url)
    {
        if (string.IsNullOrEmpty(url) || !url.StartsWith("/uploads/")) return;
        var rel = url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var abs = Path.Combine(env.ContentRootPath, rel);
        if (File.Exists(abs)) File.Delete(abs);
    }
}
