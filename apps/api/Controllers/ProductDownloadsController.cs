using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/downloads/products")]
public sealed class ProductDownloadsController(
    AppDbContext db,
    IWebHostEnvironment env) : ControllerBase
{
    [HttpGet("{token}")]
    public async Task<IActionResult> Download(string token, CancellationToken ct)
    {
        var grant = await db.ProductDownloadGrants
            .Include(row => row.Order)
            .FirstOrDefaultAsync(row => row.Token == token, ct);
        if (grant is null) return NotFound();
        if (grant.ExpiresAt < DateTime.UtcNow || grant.Order.Status != OrderStatus.Paid)
            return StatusCode(StatusCodes.Status410Gone, new { error = "download_expired" });

        var absolute = ResolveLocalUpload(grant.FilePath);
        if (absolute is null || !System.IO.File.Exists(absolute))
            return NotFound(new { error = "download_unavailable" });

        grant.DownloadCount += 1;
        grant.FirstDownloadedAt ??= DateTime.UtcNow;
        grant.LastDownloadedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var safeSlug = string.Concat(grant.ProductSlug
            .Where(character => char.IsAsciiLetterOrDigit(character) || character is '-' or '_'));
        var stream = new FileStream(
            absolute,
            FileMode.Open,
            FileAccess.Read,
            FileShare.Read,
            bufferSize: 81920,
            useAsync: true);
        return File(stream, "application/pdf", $"{safeSlug}.pdf");
    }

    private string? ResolveLocalUpload(string? url)
    {
        if (string.IsNullOrWhiteSpace(url) ||
            !url.StartsWith("/uploads/pdfs/", StringComparison.Ordinal) ||
            url.Contains('\\'))
            return null;

        var uploadsRoot = Path.GetFullPath(Path.Combine(env.ContentRootPath, "uploads"));
        var relative = url["/uploads/".Length..].Replace('/', Path.DirectorySeparatorChar);
        var absolute = Path.GetFullPath(Path.Combine(uploadsRoot, relative));
        var prefix = uploadsRoot + Path.DirectorySeparatorChar;
        return absolute.StartsWith(
            prefix,
            OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal)
            ? absolute
            : null;
    }
}
