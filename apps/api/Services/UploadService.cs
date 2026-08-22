using System.Buffers.Binary;
using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;

namespace JovieJoy.Api.Services;

public sealed record CustomerDownloadUpload(string Url, string Kind, long SizeBytes);

public interface IUploadService
{
    Task<string> SaveImageAsync(IFormFile file, string subfolder, string filePrefix, CancellationToken ct);
    Task<string> SaveVideoAsync(IFormFile file, string subfolder, string filePrefix, CancellationToken ct);
    Task<string> BeginVideoChunkSessionAsync(CancellationToken ct);
    Task<long> AppendVideoChunkAsync(string sessionId, IFormFile chunk, long offset, CancellationToken ct);
    Task<string> FinalizeVideoChunkSessionAsync(
        string sessionId, string fileName, string contentType, string subfolder, string filePrefix, CancellationToken ct);
    Task<CustomerDownloadUpload> SaveCustomerDownloadAsync(
        IFormFile file,
        string subfolder,
        string filePrefix,
        long maxBytes,
        bool allowZip,
        CancellationToken ct);
    void DeleteIfLocal(string? url);
}

public class UploadService(IWebHostEnvironment env, ILogger<UploadService> logger) : IUploadService
{
    private const long MaxImageBytes = 20 * 1024 * 1024;
    public const long MaxVideoBytes = 1024L * 1024 * 1024;
    public const int MaxZipEntries = 250;
    public const long MaxZipUncompressedBytes = 250L * 1024 * 1024;
    public const int MaxZipCompressionRatio = 100;
    private const int ZipEndOfCentralDirectorySize = 22;
    private const int ZipMaxCommentBytes = ushort.MaxValue;
    private const long MaxImagePixels = 100_000_000;
    private static readonly uint[] Crc32Table = BuildCrc32Table();

    private static readonly IReadOnlyDictionary<string, string> ImageExtensions =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp",
            ["image/gif"] = ".gif",
        };

    public async Task<string> SaveImageAsync(IFormFile file, string subfolder, string filePrefix, CancellationToken ct)
    {
        if (!ImageExtensions.TryGetValue(file.ContentType, out var ext))
            throw new InvalidOperationException("Only JPEG, PNG, WebP, or GIF images are accepted");
        if (file.Length is <= 0 or > MaxImageBytes)
            throw new InvalidOperationException("Images must be non-empty and 20 MB or smaller");

        await ValidateImageContentsAsync(file, ct);

        var uploadsRoot = GetUploadsRoot();
        var dir = ResolveInsideUploads(uploadsRoot, subfolder);
        Directory.CreateDirectory(dir);

        var fileName = $"{SanitizeFilePrefix(filePrefix)}_{Path.GetRandomFileName()}{ext}";
        var filePath = Path.Combine(dir, fileName);

        try
        {
            await using var stream = new FileStream(
                filePath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 81920,
                useAsync: true);
            await file.CopyToAsync(stream, ct);
            await stream.FlushAsync(ct);
            if (stream.Length != file.Length)
                throw new InvalidOperationException("The uploaded image ended before its declared size");
        }
        catch
        {
            try
            {
                if (File.Exists(filePath)) File.Delete(filePath);
            }
            catch (Exception cleanupError) when (cleanupError is IOException or UnauthorizedAccessException)
            {
                logger.LogWarning(cleanupError, "Could not remove incomplete upload {UploadPath}", filePath);
            }
            throw;
        }

        var relativeDir = Path.GetRelativePath(uploadsRoot, dir).Replace(Path.DirectorySeparatorChar, '/');
        return $"/uploads/{relativeDir}/{fileName}";
    }

    public async Task<string> SaveVideoAsync(IFormFile file, string subfolder, string filePrefix, CancellationToken ct)
    {
        if (file.Length is <= 0 || file.Length > MaxVideoBytes)
            throw new InvalidOperationException($"Videos must be non-empty and {FormatMegabytes(MaxVideoBytes)} MB or smaller");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var contentType = file.ContentType.Trim().ToLowerInvariant();
        ValidateVideoKind(extension, contentType);

        await ValidateVideoHeaderAsync(file, contentType, ct);

        var uploadsRoot = GetUploadsRoot();
        var dir = ResolveInsideUploads(uploadsRoot, subfolder);
        Directory.CreateDirectory(dir);
        var fileName = $"{SanitizeFilePrefix(filePrefix)}_{Path.GetRandomFileName()}{extension}";
        var filePath = Path.Combine(dir, fileName);
        try
        {
            await using var output = new FileStream(
                filePath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 81920,
                useAsync: true);
            await file.CopyToAsync(output, ct);
            await output.FlushAsync(ct);
            if (output.Length != file.Length)
                throw new InvalidOperationException("The uploaded video ended before its declared size");
        }
        catch
        {
            try
            {
                if (File.Exists(filePath)) File.Delete(filePath);
            }
            catch (Exception cleanupError) when (cleanupError is IOException or UnauthorizedAccessException)
            {
                logger.LogWarning(cleanupError, "Could not remove incomplete upload {UploadPath}", filePath);
            }
            throw;
        }

        var relativeDir = Path.GetRelativePath(uploadsRoot, dir).Replace(Path.DirectorySeparatorChar, '/');
        return $"/uploads/{relativeDir}/{fileName}";
    }

    // Chunked video uploads: the public site sits behind Cloudflare, which caps a
    // single request body at ~100 MB. Large videos arrive as sequential chunks
    // appended to a session file, then get validated and moved into place.
    private const string ChunkSessionFolder = "tmp-chunks";

    public async Task<string> BeginVideoChunkSessionAsync(CancellationToken ct)
    {
        var uploadsRoot = GetUploadsRoot();
        var dir = ResolveInsideUploads(uploadsRoot, ChunkSessionFolder);
        Directory.CreateDirectory(dir);
        var sessionId = Path.GetRandomFileName().Replace(".", "");
        await using var _ = new FileStream(
            Path.Combine(dir, $"{sessionId}.part"),
            FileMode.CreateNew, FileAccess.Write, FileShare.None, bufferSize: 1, useAsync: true);
        ct.ThrowIfCancellationRequested();
        return sessionId;
    }

    public async Task<long> AppendVideoChunkAsync(string sessionId, IFormFile chunk, long offset, CancellationToken ct)
    {
        var path = ResolveChunkSessionPath(sessionId);
        if (!File.Exists(path))
            throw new InvalidOperationException("Unknown or expired upload session — start the upload again");
        if (chunk.Length <= 0)
            throw new InvalidOperationException("Chunks must not be empty");

        await using var output = new FileStream(
            path, FileMode.Append, FileAccess.Write, FileShare.None, bufferSize: 81920, useAsync: true);
        if (output.Length != offset)
            throw new InvalidOperationException(
                $"Chunk offset {offset} does not match the {output.Length} bytes received so far — restart the upload");
        if (output.Length + chunk.Length > MaxVideoBytes)
            throw new InvalidOperationException($"Videos must be {FormatMegabytes(MaxVideoBytes)} MB or smaller");
        await chunk.CopyToAsync(output, ct);
        await output.FlushAsync(ct);
        return output.Length;
    }

    public async Task<string> FinalizeVideoChunkSessionAsync(
        string sessionId, string fileName, string contentType, string subfolder, string filePrefix, CancellationToken ct)
    {
        var path = ResolveChunkSessionPath(sessionId);
        if (!File.Exists(path))
            throw new InvalidOperationException("Unknown or expired upload session — start the upload again");

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var normalizedContentType = contentType.Trim().ToLowerInvariant();
        ValidateVideoKind(extension, normalizedContentType);

        var header = new byte[12];
        int read;
        await using (var input = new FileStream(
                         path, FileMode.Open, FileAccess.Read, FileShare.None, bufferSize: 81920, useAsync: true))
        {
            if (input.Length <= 0 || input.Length > MaxVideoBytes)
                throw new InvalidOperationException($"Videos must be non-empty and {FormatMegabytes(MaxVideoBytes)} MB or smaller");
            read = await input.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, ct);
        }
        ValidateVideoHeaderBytes(header, read, normalizedContentType);

        var uploadsRoot = GetUploadsRoot();
        var dir = ResolveInsideUploads(uploadsRoot, subfolder);
        Directory.CreateDirectory(dir);
        var finalName = $"{SanitizeFilePrefix(filePrefix)}_{Path.GetRandomFileName()}{extension}";
        var finalPath = Path.Combine(dir, finalName);
        File.Move(path, finalPath);

        var relativeDir = Path.GetRelativePath(uploadsRoot, dir).Replace(Path.DirectorySeparatorChar, '/');
        return $"/uploads/{relativeDir}/{finalName}";
    }

    private string ResolveChunkSessionPath(string sessionId)
    {
        if (string.IsNullOrEmpty(sessionId) || sessionId.Length > 64 ||
            !sessionId.All(char.IsAsciiLetterOrDigit))
            throw new InvalidOperationException("Invalid upload session id");
        var dir = ResolveInsideUploads(GetUploadsRoot(), ChunkSessionFolder);
        return Path.Combine(dir, $"{sessionId}.part");
    }

    private static void ValidateVideoKind(string extension, string contentType)
    {
        var allowed = (extension is ".mp4" or ".m4v" && contentType == "video/mp4") ||
                      (extension == ".webm" && contentType == "video/webm");
        if (!allowed)
            throw new InvalidOperationException("The file extension and content type must both identify an MP4 or WebM video");
    }

    private static async Task ValidateVideoHeaderAsync(IFormFile file, string contentType, CancellationToken ct)
    {
        // Videos are far too large to fully parse server-side, so check the
        // container magic bytes: MP4 has an "ftyp" box at offset 4, WebM opens
        // with the EBML signature.
        var header = new byte[12];
        await using var input = file.OpenReadStream();
        var read = await input.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, ct);
        ValidateVideoHeaderBytes(header, read, contentType);
    }

    private static void ValidateVideoHeaderBytes(byte[] header, int read, string contentType)
    {
        var valid = contentType switch
        {
            "video/mp4" => read >= 8 && header.AsSpan(4, 4).SequenceEqual("ftyp"u8),
            "video/webm" => read >= 4 && header.AsSpan(0, 4).SequenceEqual(new byte[] { 0x1a, 0x45, 0xdf, 0xa3 }),
            _ => false,
        };
        if (!valid)
            throw new InvalidOperationException("The uploaded bytes do not match the declared video type");
    }

    public async Task<CustomerDownloadUpload> SaveCustomerDownloadAsync(
        IFormFile file,
        string subfolder,
        string filePrefix,
        long maxBytes,
        bool allowZip,
        CancellationToken ct)
    {
        if (file.Length is <= 0 || file.Length > maxBytes)
            throw new InvalidOperationException($"Downloads must be non-empty and {FormatMegabytes(maxBytes)} MB or smaller");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var contentType = file.ContentType.Trim().ToLowerInvariant();
        string kind;
        if (extension == ".pdf" && contentType == "application/pdf")
        {
            kind = "pdf";
            await ValidatePdfAsync(file, ct);
        }
        else if (allowZip && extension == ".zip" &&
                 contentType is "application/zip" or "application/x-zip-compressed")
        {
            kind = "zip";
            await ValidateZipAsync(file, ct);
        }
        else
        {
            var allowed = allowZip ? "PDF or ZIP" : "PDF";
            throw new InvalidOperationException($"The file extension and content type must both identify an allowed {allowed} file");
        }

        var uploadsRoot = GetUploadsRoot();
        var dir = ResolveInsideUploads(uploadsRoot, subfolder);
        Directory.CreateDirectory(dir);
        var fileName = $"{SanitizeFilePrefix(filePrefix)}_{Path.GetRandomFileName()}{extension}";
        var filePath = Path.Combine(dir, fileName);
        try
        {
            await using (var output = new FileStream(
                             filePath,
                             FileMode.CreateNew,
                             FileAccess.Write,
                             FileShare.None,
                             bufferSize: 81920,
                             useAsync: true))
            {
                await file.CopyToAsync(output, ct);
                await output.FlushAsync(ct);
                if (output.Length != file.Length)
                    throw new InvalidOperationException("The uploaded file ended before its declared size");
            }
        }
        catch
        {
            try
            {
                if (File.Exists(filePath)) File.Delete(filePath);
            }
            catch (Exception cleanupError) when (cleanupError is IOException or UnauthorizedAccessException)
            {
                logger.LogWarning(cleanupError, "Could not remove incomplete upload {UploadPath}", filePath);
            }
            throw;
        }

        var relativeDir = Path.GetRelativePath(uploadsRoot, dir).Replace(Path.DirectorySeparatorChar, '/');
        return new CustomerDownloadUpload($"/uploads/{relativeDir}/{fileName}", kind, file.Length);
    }

    public void DeleteIfLocal(string? url)
    {
        if (string.IsNullOrEmpty(url) || !url.StartsWith("/uploads/")) return;
        try
        {
            var uploadsRoot = GetUploadsRoot();
            var relative = url["/uploads/".Length..]
                .Replace('/', Path.DirectorySeparatorChar)
                .Replace('\\', Path.DirectorySeparatorChar);
            var absolute = ResolveInsideUploads(uploadsRoot, relative);
            if (File.Exists(absolute)) File.Delete(absolute);
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex, "Refused to delete upload path {UploadUrl}", url);
        }
        catch (IOException ex)
        {
            logger.LogWarning(ex, "Could not delete upload path {UploadUrl}", url);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogWarning(ex, "Could not delete upload path {UploadUrl}", url);
        }
        catch (ArgumentException ex)
        {
            logger.LogWarning(ex, "Refused to delete invalid upload path {UploadUrl}", url);
        }
        catch (NotSupportedException ex)
        {
            logger.LogWarning(ex, "Refused to delete invalid upload path {UploadUrl}", url);
        }
    }

    public static string SanitizeFilePrefix(string value)
    {
        var safe = new string(value
            .Select(character => char.IsAsciiLetterOrDigit(character) || character is '-' or '_' ? character : '-')
            .ToArray())
            .Trim('-');
        if (string.IsNullOrEmpty(safe)) return "asset";
        return safe.Length <= 80 ? safe : safe[..80];
    }

    public static bool ImageFileNameMatchesContentType(IFormFile file)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        return file.ContentType.Trim().ToLowerInvariant() switch
        {
            "image/jpeg" => extension is ".jpg" or ".jpeg",
            "image/png" => extension == ".png",
            "image/webp" => extension == ".webp",
            "image/gif" => extension == ".gif",
            _ => false,
        };
    }

    private static async Task ValidatePdfAsync(IFormFile file, CancellationToken ct)
    {
        if (file.Length < 32 || file.Length > int.MaxValue)
            throw new InvalidOperationException("The PDF is incomplete");

        var bytes = await ReadDeclaredBytesAsync(file, ct);
        if (!bytes.AsSpan(0, 5).SequenceEqual("%PDF-"u8) ||
            !char.IsAsciiDigit((char)bytes[5]) || bytes[6] != '.' || !char.IsAsciiDigit((char)bytes[7]))
            throw new InvalidOperationException("The uploaded bytes do not contain a valid PDF header");

        var eofIndex = bytes.AsSpan().LastIndexOf("%%EOF"u8);
        if (eofIndex < 0 || !ContainsOnlyPdfTrailingWhitespace(bytes, eofIndex + 5))
            throw new InvalidOperationException("The PDF is missing a valid end-of-file marker");

        var text = Encoding.Latin1.GetString(bytes);
        var startXrefMatches = Regex.Matches(
            text[..eofIndex],
            @"startxref\s+(\d+)\s*$",
            RegexOptions.CultureInvariant);
        if (startXrefMatches.Count == 0 ||
            !long.TryParse(
                startXrefMatches[^1].Groups[1].Value,
                System.Globalization.NumberStyles.None,
                System.Globalization.CultureInfo.InvariantCulture,
                out var xrefOffset) ||
            xrefOffset < 0 || xrefOffset >= eofIndex)
            throw new InvalidOperationException("The PDF has an invalid cross-reference offset");

        var xrefIndex = SkipPdfWhitespace(bytes, checked((int)xrefOffset));
        var classicXref = bytes.AsSpan(xrefIndex).StartsWith("xref"u8);
        var xrefStream = IsPdfXrefStreamAt(text, xrefIndex);
        if (!classicXref && !xrefStream)
            throw new InvalidOperationException("The PDF cross-reference offset does not point to an xref table or stream");

        if (classicXref)
            ValidateClassicPdfXref(bytes, text, xrefIndex, eofIndex);
        else
            ValidatePdfStreamAt(bytes, text, xrefIndex, requireXrefDictionary: true);

        if (!Regex.IsMatch(text, @"\b\d+\s+\d+\s+obj\b[\s\S]*?/Type\s*/Catalog\b[\s\S]*?\bendobj\b", RegexOptions.CultureInvariant))
            throw new InvalidOperationException("The PDF does not contain a catalog object");

        ValidateDirectLengthPdfStreams(bytes, text);
    }

    private static bool IsPdfTrailingWhitespace(byte value) => value is 0x00 or 0x09 or 0x0a or 0x0c or 0x0d or 0x20;

    private static bool ContainsOnlyPdfTrailingWhitespace(byte[] bytes, int startIndex)
    {
        for (var index = startIndex; index < bytes.Length; index++)
            if (!IsPdfTrailingWhitespace(bytes[index])) return false;
        return true;
    }

    private static int SkipPdfWhitespace(byte[] bytes, int index)
    {
        while (index < bytes.Length && IsPdfTrailingWhitespace(bytes[index])) index++;
        return index;
    }

    private static bool IsPdfXrefStreamAt(string text, int offset)
    {
        var remaining = text.AsSpan(offset);
        var match = Regex.Match(
            remaining.Length > 8192 ? remaining[..8192].ToString() : remaining.ToString(),
            @"^\d+\s+\d+\s+obj\s*<<[\s\S]*?/Type\s*/XRef\b",
            RegexOptions.CultureInvariant);
        return match.Success;
    }

    private static void ValidateClassicPdfXref(byte[] bytes, string text, int xrefIndex, int eofIndex)
    {
        var trailerIndex = text.IndexOf("trailer", xrefIndex + 4, StringComparison.Ordinal);
        if (trailerIndex < 0 || trailerIndex >= eofIndex)
            throw new InvalidOperationException("The PDF cross-reference table has no trailer");

        var xrefBody = text[(xrefIndex + 4)..trailerIndex];
        var lines = xrefBody.Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n')
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var lineIndex = 0;
        var inUseEntries = 0;
        while (lineIndex < lines.Length)
        {
            var section = lines[lineIndex++].Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (section.Length != 2 ||
                !int.TryParse(section[0], out _) ||
                !int.TryParse(section[1], out var count) ||
                count < 0 || count > 10_000_000 || lineIndex + count > lines.Length)
                throw new InvalidOperationException("The PDF cross-reference table is malformed");

            for (var entryIndex = 0; entryIndex < count; entryIndex++)
            {
                var entry = lines[lineIndex++].Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (entry.Length != 3 || entry[0].Length != 10 || entry[1].Length != 5 ||
                    !long.TryParse(entry[0], out var objectOffset) ||
                    !int.TryParse(entry[1], out _) || entry[2] is not ("n" or "f"))
                    throw new InvalidOperationException("The PDF cross-reference entry is malformed");
                if (entry[2] == "n")
                {
                    if (objectOffset < 0 || objectOffset >= bytes.Length)
                        throw new InvalidOperationException("The PDF cross-reference entry points outside the file");
                    inUseEntries++;
                }
            }
        }
        if (inUseEntries == 0)
            throw new InvalidOperationException("The PDF cross-reference table contains no objects");

        var trailerEnd = text.IndexOf("startxref", trailerIndex, StringComparison.Ordinal);
        if (trailerEnd < 0 || trailerEnd > eofIndex) trailerEnd = eofIndex;
        var trailer = text[trailerIndex..trailerEnd];
        if (!Regex.IsMatch(trailer, @"/Size\s+\d+\b", RegexOptions.CultureInvariant) ||
            !Regex.IsMatch(trailer, @"/Root\s+\d+\s+\d+\s+R\b", RegexOptions.CultureInvariant))
            throw new InvalidOperationException("The PDF trailer is missing its size or root reference");
    }

    private static void ValidateDirectLengthPdfStreams(byte[] bytes, string text)
    {
        foreach (Match match in Regex.Matches(
                     text,
                     @"/Length\s+(\d+)\b(?!\s+\d+\s+R\b)(?:(?!\bendobj\b|\bstream\b)[\s\S]){0,4096}?>>\s*stream(?:\r\n|\r|\n)",
                     RegexOptions.CultureInvariant))
        {
            if (!int.TryParse(match.Groups[1].Value, out var length) || length < 0)
                throw new InvalidOperationException("A PDF stream declares an invalid length");
            var dataStart = match.Index + match.Length;
            var end = (long)dataStart + length;
            if (end > bytes.Length)
                throw new InvalidOperationException("A PDF stream ends before its declared length");
            var endIndex = SkipPdfWhitespace(bytes, (int)end);
            if (!bytes.AsSpan(endIndex).StartsWith("endstream"u8))
                throw new InvalidOperationException("A PDF stream length does not match its data");
        }
    }

    private static void ValidatePdfStreamAt(byte[] bytes, string text, int objectOffset, bool requireXrefDictionary)
    {
        var streamIndex = text.IndexOf("stream", objectOffset, StringComparison.Ordinal);
        var endObjectIndex = text.IndexOf("endobj", objectOffset, StringComparison.Ordinal);
        if (streamIndex < 0 || endObjectIndex < 0 || streamIndex > endObjectIndex)
            throw new InvalidOperationException("The PDF xref stream object is incomplete");
        var dictionary = text[objectOffset..streamIndex];
        if (requireXrefDictionary &&
            (!Regex.IsMatch(dictionary, @"/Type\s*/XRef\b", RegexOptions.CultureInvariant) ||
             !Regex.IsMatch(dictionary, @"/Size\s+\d+\b", RegexOptions.CultureInvariant) ||
             !Regex.IsMatch(dictionary, @"/W\s*\[\s*\d+\s+\d+\s+\d+\s*\]", RegexOptions.CultureInvariant) ||
             !Regex.IsMatch(dictionary, @"/Root\s+\d+\s+\d+\s+R\b", RegexOptions.CultureInvariant)))
            throw new InvalidOperationException("The PDF xref stream dictionary is incomplete");
    }

    private static async Task ValidateZipAsync(IFormFile file, CancellationToken ct)
    {
        try
        {
            await using var input = file.OpenReadStream();
            if (!input.CanSeek)
                throw new InvalidOperationException("The ZIP upload stream must be seekable");

            var centralEntries = await ReadZipCentralDirectoryAsync(input, file.Length, ct);
            if (centralEntries.Count == 0)
                throw new InvalidOperationException("ZIP archives must contain at least one entry");
            if (centralEntries.Count > MaxZipEntries)
                throw new InvalidOperationException($"ZIP archives can contain at most {MaxZipEntries} entries");

            long declaredUncompressed = 0;
            long declaredCompressed = 0;
            foreach (var entry in centralEntries)
            {
                if ((entry.Flags & 0x0001) != 0 || (entry.Flags & 0x0040) != 0)
                    throw new InvalidOperationException("Encrypted ZIP entries are not accepted");
                if (entry.IsSymbolicLink)
                    throw new InvalidOperationException("Symbolic links are not accepted in ZIP archives");
                if (!IsSafeZipEntryPath(entry.Name))
                    throw new InvalidOperationException($"ZIP entry '{entry.Name}' contains an unsafe path");
                if (ExpansionRatioExceedsLimit(entry.UncompressedSize, entry.CompressedSize))
                    throw new InvalidOperationException($"ZIP entry '{entry.Name}' exceeds the {MaxZipCompressionRatio}:1 expansion ratio limit");

                declaredUncompressed += entry.UncompressedSize;
                declaredCompressed += entry.CompressedSize;
                if (declaredUncompressed > MaxZipUncompressedBytes)
                    throw new InvalidOperationException($"ZIP contents can expand to at most {FormatMegabytes(MaxZipUncompressedBytes)} MB");
            }
            if (ExpansionRatioExceedsLimit(declaredUncompressed, declaredCompressed))
                throw new InvalidOperationException($"ZIP contents exceed the {MaxZipCompressionRatio}:1 expansion ratio limit");

            input.Position = 0;
            using var archive = new ZipArchive(input, ZipArchiveMode.Read, leaveOpen: true);
            if (archive.Entries.Count != centralEntries.Count)
                throw new InvalidOperationException("The ZIP central directory is inconsistent");

            long actualUncompressed = 0;
            var buffer = new byte[81920];
            for (var index = 0; index < archive.Entries.Count; index++)
            {
                var archiveEntry = archive.Entries[index];
                var declaredEntry = centralEntries[index];
                if (!IsSafeZipEntryPath(archiveEntry.FullName) ||
                    archiveEntry.Length != declaredEntry.UncompressedSize ||
                    archiveEntry.CompressedLength != declaredEntry.CompressedSize)
                    throw new InvalidOperationException("The ZIP central directory is inconsistent");

                long actualEntryLength = 0;
                var crc = uint.MaxValue;
                await using var entryStream = archiveEntry.Open();
                while (true)
                {
                    var read = await entryStream.ReadAsync(buffer, ct);
                    if (read == 0) break;
                    actualEntryLength += read;
                    actualUncompressed += read;
                    if (actualEntryLength > declaredEntry.UncompressedSize || actualUncompressed > MaxZipUncompressedBytes)
                        throw new InvalidOperationException("ZIP contents exceed their declared safe size");
                    crc = UpdateCrc32(crc, buffer, read);
                }

                if (actualEntryLength != declaredEntry.UncompressedSize || ~crc != declaredEntry.Crc32)
                    throw new InvalidOperationException($"ZIP entry '{archiveEntry.FullName}' is corrupt");
            }
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex) when (ex is InvalidDataException or IOException or NotSupportedException or DecoderFallbackException)
        {
            throw new InvalidOperationException("The ZIP archive is corrupt or unsupported", ex);
        }
    }

    private static async Task<List<ZipCentralEntry>> ReadZipCentralDirectoryAsync(
        Stream input,
        long fileLength,
        CancellationToken ct)
    {
        if (fileLength < ZipEndOfCentralDirectorySize)
            throw new InvalidOperationException("The ZIP archive is incomplete");

        var firstSignature = new byte[4];
        input.Position = 0;
        await input.ReadExactlyAsync(firstSignature, ct);
        if (!firstSignature.AsSpan().SequenceEqual("PK\x03\x04"u8))
            throw new InvalidOperationException("The uploaded bytes do not contain a valid ZIP header");

        var tailLength = (int)Math.Min(fileLength, ZipEndOfCentralDirectorySize + ZipMaxCommentBytes);
        var tail = new byte[tailLength];
        input.Seek(-tailLength, SeekOrigin.End);
        await input.ReadExactlyAsync(tail, ct);

        var eocdIndex = -1;
        for (var index = tail.Length - ZipEndOfCentralDirectorySize; index >= 0; index--)
        {
            if (!tail.AsSpan(index, 4).SequenceEqual("PK\x05\x06"u8)) continue;
            var commentLength = BinaryPrimitives.ReadUInt16LittleEndian(tail.AsSpan(index + 20, 2));
            if (index + ZipEndOfCentralDirectorySize + commentLength == tail.Length)
            {
                eocdIndex = index;
                break;
            }
        }
        if (eocdIndex < 0)
            throw new InvalidOperationException("The ZIP archive is missing its end-of-central-directory record");

        var eocd = tail.AsSpan(eocdIndex, ZipEndOfCentralDirectorySize);
        var diskNumber = BinaryPrimitives.ReadUInt16LittleEndian(eocd.Slice(4, 2));
        var centralDisk = BinaryPrimitives.ReadUInt16LittleEndian(eocd.Slice(6, 2));
        var entriesOnDisk = BinaryPrimitives.ReadUInt16LittleEndian(eocd.Slice(8, 2));
        var entryCount = BinaryPrimitives.ReadUInt16LittleEndian(eocd.Slice(10, 2));
        var centralSize = BinaryPrimitives.ReadUInt32LittleEndian(eocd.Slice(12, 4));
        var centralOffset = BinaryPrimitives.ReadUInt32LittleEndian(eocd.Slice(16, 4));
        if (diskNumber != 0 || centralDisk != 0 || entriesOnDisk != entryCount)
            throw new InvalidOperationException("Multi-disk ZIP archives are not accepted");
        if (entryCount == ushort.MaxValue || centralSize == uint.MaxValue || centralOffset == uint.MaxValue)
            throw new InvalidOperationException("ZIP64 archives are not accepted");
        if (entryCount > MaxZipEntries)
            throw new InvalidOperationException($"ZIP archives can contain at most {MaxZipEntries} entries");

        var eocdAbsolute = fileLength - tailLength + eocdIndex;
        if ((long)centralOffset + centralSize != eocdAbsolute)
            throw new InvalidOperationException("The ZIP central directory has an invalid offset or size");

        input.Position = centralOffset;
        var entries = new List<ZipCentralEntry>(entryCount);
        for (var index = 0; index < entryCount; index++)
        {
            var header = new byte[46];
            await input.ReadExactlyAsync(header, ct);
            if (!header.AsSpan(0, 4).SequenceEqual("PK\x01\x02"u8))
                throw new InvalidOperationException("The ZIP central directory is corrupt");

            var versionMadeBy = BinaryPrimitives.ReadUInt16LittleEndian(header.AsSpan(4, 2));
            var flags = BinaryPrimitives.ReadUInt16LittleEndian(header.AsSpan(8, 2));
            var crc32 = BinaryPrimitives.ReadUInt32LittleEndian(header.AsSpan(16, 4));
            var compressedSize = BinaryPrimitives.ReadUInt32LittleEndian(header.AsSpan(20, 4));
            var uncompressedSize = BinaryPrimitives.ReadUInt32LittleEndian(header.AsSpan(24, 4));
            var nameLength = BinaryPrimitives.ReadUInt16LittleEndian(header.AsSpan(28, 2));
            var extraLength = BinaryPrimitives.ReadUInt16LittleEndian(header.AsSpan(30, 2));
            var commentLength = BinaryPrimitives.ReadUInt16LittleEndian(header.AsSpan(32, 2));
            var diskStart = BinaryPrimitives.ReadUInt16LittleEndian(header.AsSpan(34, 2));
            var externalAttributes = BinaryPrimitives.ReadUInt32LittleEndian(header.AsSpan(38, 4));
            if (compressedSize == uint.MaxValue || uncompressedSize == uint.MaxValue || diskStart != 0)
                throw new InvalidOperationException("ZIP64 and multi-disk entries are not accepted");

            var nameBytes = new byte[nameLength];
            await input.ReadExactlyAsync(nameBytes, ct);
            var name = (flags & 0x0800) != 0
                ? new UTF8Encoding(false, true).GetString(nameBytes)
                : Encoding.Latin1.GetString(nameBytes);
            input.Seek(extraLength + commentLength, SeekOrigin.Current);

            var hostSystem = versionMadeBy >> 8;
            var unixMode = externalAttributes >> 16;
            var symbolicLink = hostSystem == 3 && (unixMode & 0xf000) == 0xa000;
            entries.Add(new ZipCentralEntry(
                name,
                flags,
                compressedSize,
                uncompressedSize,
                crc32,
                symbolicLink));
        }

        if (input.Position != (long)centralOffset + centralSize)
            throw new InvalidOperationException("The ZIP central directory size is inconsistent");
        return entries;
    }

    private static bool IsSafeZipEntryPath(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || path.Length > 1024 || path.Any(char.IsControl)) return false;
        var normalized = path.Replace('\\', '/');
        if (normalized.StartsWith('/') || normalized.Contains(':')) return false;
        return normalized.Split('/', StringSplitOptions.RemoveEmptyEntries)
            .All(segment => segment is not "." and not "..");
    }

    private static bool ExpansionRatioExceedsLimit(long uncompressed, long compressed) =>
        uncompressed > 0 && (compressed == 0 || uncompressed > compressed * MaxZipCompressionRatio);

    private static uint UpdateCrc32(uint crc, byte[] buffer, int count)
    {
        for (var index = 0; index < count; index++)
            crc = (crc >> 8) ^ Crc32Table[(crc ^ buffer[index]) & 0xff];
        return crc;
    }

    private static uint[] BuildCrc32Table()
    {
        var table = new uint[256];
        for (uint index = 0; index < table.Length; index++)
        {
            var value = index;
            for (var bit = 0; bit < 8; bit++)
                value = (value >> 1) ^ ((value & 1) == 0 ? 0u : 0xedb88320u);
            table[index] = value;
        }
        return table;
    }

    private static string FormatMegabytes(long bytes) =>
        (bytes / (1024L * 1024L)).ToString(System.Globalization.CultureInfo.InvariantCulture);

    private sealed record ZipCentralEntry(
        string Name,
        ushort Flags,
        long CompressedSize,
        long UncompressedSize,
        uint Crc32,
        bool IsSymbolicLink);

    private static async Task ValidateImageContentsAsync(IFormFile file, CancellationToken ct)
    {
        if (file.Length > int.MaxValue)
            throw new InvalidOperationException("The uploaded image is too large to validate");
        var bytes = await ReadDeclaredBytesAsync(file, ct);

        bool valid;
        try
        {
            valid = file.ContentType.ToLowerInvariant() switch
            {
                "image/png" => IsStructurallyValidPng(bytes),
                "image/jpeg" => IsStructurallyValidJpeg(bytes),
                "image/gif" => IsStructurallyValidGif(bytes),
                "image/webp" => IsStructurallyValidWebp(bytes),
                _ => false,
            };
        }
        catch (Exception ex) when (ex is InvalidDataException or OverflowException or ArgumentException)
        {
            valid = false;
        }

        if (!valid)
            throw new InvalidOperationException("The uploaded bytes do not match the declared image type");
    }

    private static async Task<byte[]> ReadDeclaredBytesAsync(IFormFile file, CancellationToken ct)
    {
        var bytes = new byte[checked((int)file.Length)];
        await using var input = file.OpenReadStream();
        await input.ReadExactlyAsync(bytes, ct);
        if (input.ReadByte() != -1)
            throw new InvalidOperationException("The upload is longer than its declared size");
        return bytes;
    }

    private static bool IsStructurallyValidPng(byte[] bytes)
    {
        if (bytes.Length < 45 || !bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }))
            return false;

        var offset = 8;
        var sawHeader = false;
        var sawData = false;
        var compressed = new MemoryStream();
        uint width = 0;
        uint height = 0;
        byte bitDepth = 0;
        byte colorType = 0;
        byte interlace = 0;

        while (offset < bytes.Length)
        {
            if (bytes.Length - offset < 12) return false;
            var lengthValue = BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(offset, 4));
            if (lengthValue > int.MaxValue) return false;
            var length = (int)lengthValue;
            if (length > bytes.Length - offset - 12) return false;
            var type = bytes.AsSpan(offset + 4, 4);
            var data = bytes.AsSpan(offset + 8, length);
            var storedCrc = BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(offset + 8 + length, 4));
            var crc = uint.MaxValue;
            crc = UpdateCrc32(crc, type);
            crc = UpdateCrc32(crc, data);
            if (~crc != storedCrc) return false;

            if (!sawHeader)
            {
                if (!type.SequenceEqual("IHDR"u8) || length != 13) return false;
                width = BinaryPrimitives.ReadUInt32BigEndian(data[..4]);
                height = BinaryPrimitives.ReadUInt32BigEndian(data.Slice(4, 4));
                bitDepth = data[8];
                colorType = data[9];
                interlace = data[12];
                if (!ValidPngHeader(width, height, bitDepth, colorType, data[10], data[11], interlace)) return false;
                sawHeader = true;
            }
            else if (type.SequenceEqual("IHDR"u8))
            {
                return false;
            }
            else if (type.SequenceEqual("IDAT"u8))
            {
                if (length > 0) compressed.Write(data);
                sawData = true;
            }
            else if (type.SequenceEqual("IEND"u8))
            {
                if (length != 0 || !sawData || offset + 12 != bytes.Length) return false;
                return HasValidPngImageData(compressed.ToArray(), width, height, bitDepth, colorType, interlace);
            }

            offset += 12 + length;
        }
        return false;
    }

    private static bool ValidPngHeader(
        uint width, uint height, byte bitDepth, byte colorType,
        byte compression, byte filter, byte interlace)
    {
        if (width == 0 || height == 0 || (long)width * height > MaxImagePixels ||
            compression != 0 || filter != 0 || interlace > 1) return false;
        return colorType switch
        {
            0 => bitDepth is 1 or 2 or 4 or 8 or 16,
            2 => bitDepth is 8 or 16,
            3 => bitDepth is 1 or 2 or 4 or 8,
            4 => bitDepth is 8 or 16,
            6 => bitDepth is 8 or 16,
            _ => false,
        };
    }

    private static bool HasValidPngImageData(
        byte[] compressed, uint width, uint height, byte bitDepth, byte colorType, byte interlace)
    {
        if (compressed.Length == 0) return false;
        var channels = colorType switch { 0 => 1, 2 => 3, 3 => 1, 4 => 2, 6 => 4, _ => 0 };
        long ScanlineBytes(uint passWidth, uint passHeight) =>
            passWidth == 0 || passHeight == 0
                ? 0
                : checked(((long)passWidth * channels * bitDepth + 7) / 8 + 1) * passHeight;

        long expected;
        if (interlace == 0)
        {
            expected = ScanlineBytes(width, height);
        }
        else
        {
            ReadOnlySpan<int> xStarts = [0, 4, 0, 2, 0, 1, 0];
            ReadOnlySpan<int> yStarts = [0, 0, 4, 0, 2, 0, 1];
            ReadOnlySpan<int> xSteps = [8, 8, 4, 4, 2, 2, 1];
            ReadOnlySpan<int> ySteps = [8, 8, 8, 4, 4, 2, 2];
            expected = 0;
            for (var pass = 0; pass < 7; pass++)
            {
                var passWidth = width <= xStarts[pass] ? 0u : (uint)(((long)width - xStarts[pass] + xSteps[pass] - 1) / xSteps[pass]);
                var passHeight = height <= yStarts[pass] ? 0u : (uint)(((long)height - yStarts[pass] + ySteps[pass] - 1) / ySteps[pass]);
                expected = checked(expected + ScanlineBytes(passWidth, passHeight));
            }
        }

        using var source = new MemoryStream(compressed, writable: false);
        using var inflater = new ZLibStream(source, CompressionMode.Decompress);
        var buffer = new byte[81920];
        long actual = 0;
        while (true)
        {
            var read = inflater.Read(buffer);
            if (read == 0) break;
            actual += read;
            if (actual > expected) return false;
        }
        return actual == expected;
    }

    private static bool IsStructurallyValidJpeg(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 12 || bytes[0] != 0xff || bytes[1] != 0xd8) return false;
        var offset = 2;
        var sawFrame = false;
        var sawScan = false;
        while (offset < bytes.Length)
        {
            if (bytes[offset++] != 0xff) return false;
            while (offset < bytes.Length && bytes[offset] == 0xff) offset++;
            if (offset >= bytes.Length) return false;
            var marker = bytes[offset++];
            if (marker == 0xd9) return sawFrame && sawScan && offset == bytes.Length;
            if (marker is 0x00 or 0xd8 || marker is >= 0xd0 and <= 0xd7 || marker == 0x01) return false;
            if (offset + 2 > bytes.Length) return false;
            var segmentLength = BinaryPrimitives.ReadUInt16BigEndian(bytes.Slice(offset, 2));
            if (segmentLength < 2 || segmentLength > bytes.Length - offset) return false;
            var payloadStart = offset + 2;
            var payloadLength = segmentLength - 2;

            if (IsJpegStartOfFrame(marker))
            {
                if (payloadLength < 6) return false;
                var height = BinaryPrimitives.ReadUInt16BigEndian(bytes.Slice(payloadStart + 1, 2));
                var width = BinaryPrimitives.ReadUInt16BigEndian(bytes.Slice(payloadStart + 3, 2));
                var components = bytes[payloadStart + 5];
                if (width == 0 || height == 0 || (long)width * height > MaxImagePixels ||
                    components is < 1 or > 4 || payloadLength != 6 + components * 3) return false;
                sawFrame = true;
            }

            offset += segmentLength;
            if (marker != 0xda) continue;
            if (!sawFrame || payloadLength < 4) return false;
            sawScan = true;

            // Entropy-coded data continues until an unstuffed, non-restart marker.
            while (offset < bytes.Length)
            {
                if (bytes[offset++] != 0xff) continue;
                while (offset < bytes.Length && bytes[offset] == 0xff) offset++;
                if (offset >= bytes.Length) return false;
                var entropyMarker = bytes[offset];
                if (entropyMarker == 0x00 || entropyMarker is >= 0xd0 and <= 0xd7)
                {
                    offset++;
                    continue;
                }
                offset--; // Re-read this marker through the normal segment parser.
                break;
            }
        }
        return false;
    }

    private static bool IsJpegStartOfFrame(byte marker) =>
        marker is >= 0xc0 and <= 0xcf && marker is not (0xc4 or 0xc8 or 0xcc);

    private static bool IsStructurallyValidGif(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 20 ||
            (!bytes[..6].SequenceEqual("GIF87a"u8) && !bytes[..6].SequenceEqual("GIF89a"u8))) return false;
        var width = BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(6, 2));
        var height = BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(8, 2));
        if (width == 0 || height == 0 || (long)width * height > MaxImagePixels) return false;

        var offset = 13;
        var packed = bytes[10];
        if ((packed & 0x80) != 0)
        {
            var tableBytes = 3 * (1 << ((packed & 0x07) + 1));
            if (tableBytes > bytes.Length - offset) return false;
            offset += tableBytes;
        }

        var sawImage = false;
        while (offset < bytes.Length)
        {
            var introducer = bytes[offset++];
            if (introducer == 0x3b) return sawImage && offset == bytes.Length;
            if (introducer == 0x21)
            {
                if (offset >= bytes.Length) return false;
                offset++; // extension label
                if (!SkipGifSubBlocks(bytes, ref offset)) return false;
                continue;
            }
            if (introducer != 0x2c || offset + 9 > bytes.Length) return false;
            var imageWidth = BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(offset + 4, 2));
            var imageHeight = BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(offset + 6, 2));
            if (imageWidth == 0 || imageHeight == 0 || (long)imageWidth * imageHeight > MaxImagePixels) return false;
            var imagePacked = bytes[offset + 8];
            offset += 9;
            if ((imagePacked & 0x80) != 0)
            {
                var tableBytes = 3 * (1 << ((imagePacked & 0x07) + 1));
                if (tableBytes > bytes.Length - offset) return false;
                offset += tableBytes;
            }
            if (offset >= bytes.Length) return false;
            var minimumCodeSize = bytes[offset++];
            if (minimumCodeSize is < 2 or > 8) return false;
            var compressed = new List<byte>();
            if (!ReadGifSubBlocks(bytes, ref offset, compressed) ||
                !HasValidGifLzwData(compressed, minimumCodeSize, checked(imageWidth * imageHeight))) return false;
            sawImage = true;
        }
        return false;
    }

    private static bool SkipGifSubBlocks(ReadOnlySpan<byte> bytes, ref int offset) =>
        ReadGifSubBlocks(bytes, ref offset, null);

    private static bool ReadGifSubBlocks(ReadOnlySpan<byte> bytes, ref int offset, List<byte>? output)
    {
        while (offset < bytes.Length)
        {
            var length = bytes[offset++];
            if (length == 0) return true;
            if (length > bytes.Length - offset) return false;
            if (output is not null)
                for (var i = 0; i < length; i++) output.Add(bytes[offset + i]);
            offset += length;
        }
        return false;
    }

    private static bool HasValidGifLzwData(List<byte> data, int minimumCodeSize, int expectedPixels)
    {
        var clear = 1 << minimumCodeSize;
        var end = clear + 1;
        var lengths = new int[4096];
        for (var i = 0; i < clear; i++) lengths[i] = 1;
        var nextCode = end + 1;
        var codeSize = minimumCodeSize + 1;
        var bitOffset = 0;
        var previous = -1;
        var outputPixels = 0;
        var sawClear = false;

        int ReadCode()
        {
            if (bitOffset + codeSize > data.Count * 8) return -1;
            var result = 0;
            for (var bit = 0; bit < codeSize; bit++)
            {
                var absoluteBit = bitOffset + bit;
                result |= ((data[absoluteBit / 8] >> (absoluteBit % 8)) & 1) << bit;
            }
            bitOffset += codeSize;
            return result;
        }

        while (true)
        {
            var code = ReadCode();
            if (code < 0) return false;
            if (code == clear)
            {
                sawClear = true;
                nextCode = end + 1;
                codeSize = minimumCodeSize + 1;
                previous = -1;
                continue;
            }
            if (!sawClear) return false;
            if (code == end) return outputPixels == expectedPixels;
            if (code > nextCode || code >= lengths.Length || (code == nextCode && previous < 0)) return false;

            var emitted = code == nextCode ? lengths[previous] + 1 : lengths[code];
            if (emitted <= 0 || outputPixels > expectedPixels - emitted) return false;
            outputPixels += emitted;
            if (previous >= 0 && nextCode < 4096)
            {
                lengths[nextCode++] = lengths[previous] + 1;
                if (nextCode == (1 << codeSize) && codeSize < 12) codeSize++;
            }
            previous = code;
        }
    }

    private static bool IsStructurallyValidWebp(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 20 || !bytes[..4].SequenceEqual("RIFF"u8) || !bytes.Slice(8, 4).SequenceEqual("WEBP"u8))
            return false;
        if (BinaryPrimitives.ReadUInt32LittleEndian(bytes.Slice(4, 4)) + 8L != bytes.Length) return false;

        var offset = 12;
        var sawImage = false;
        var sawExtended = false;
        var sawAnimationHeader = false;
        var sawAnimationFrame = false;
        while (offset < bytes.Length)
        {
            if (bytes.Length - offset < 8) return false;
            var type = bytes.Slice(offset, 4);
            var lengthValue = BinaryPrimitives.ReadUInt32LittleEndian(bytes.Slice(offset + 4, 4));
            if (lengthValue > int.MaxValue) return false;
            var length = (int)lengthValue;
            var paddedLength = length + (length & 1);
            if (paddedLength > bytes.Length - offset - 8) return false;
            var payload = bytes.Slice(offset + 8, length);

            if (type.SequenceEqual("VP8 "u8))
            {
                if (payload.Length < 10 || (payload[0] & 1) != 0 || !payload.Slice(3, 3).SequenceEqual(new byte[] { 0x9d, 0x01, 0x2a })) return false;
                var width = BinaryPrimitives.ReadUInt16LittleEndian(payload.Slice(6, 2)) & 0x3fff;
                var height = BinaryPrimitives.ReadUInt16LittleEndian(payload.Slice(8, 2)) & 0x3fff;
                if (width == 0 || height == 0 || (long)width * height > MaxImagePixels) return false;
                sawImage = true;
            }
            else if (type.SequenceEqual("VP8L"u8))
            {
                if (payload.Length < 5 || payload[0] != 0x2f) return false;
                var packed = BinaryPrimitives.ReadUInt32LittleEndian(payload.Slice(1, 4));
                var width = (packed & 0x3fff) + 1;
                var height = ((packed >> 14) & 0x3fff) + 1;
                if ((packed >> 29) != 0 || (long)width * height > MaxImagePixels) return false;
                sawImage = true;
            }
            else if (type.SequenceEqual("VP8X"u8))
            {
                if (sawExtended || offset != 12 || payload.Length != 10 || (payload[0] & 0xc1) != 0) return false;
                var width = ReadUInt24LittleEndian(payload.Slice(4, 3)) + 1;
                var height = ReadUInt24LittleEndian(payload.Slice(7, 3)) + 1;
                if ((long)width * height > MaxImagePixels) return false;
                sawExtended = true;
            }
            else if (type.SequenceEqual("ANIM"u8))
            {
                if (!sawExtended || payload.Length != 6) return false;
                sawAnimationHeader = true;
            }
            else if (type.SequenceEqual("ANMF"u8))
            {
                if (!sawAnimationHeader || payload.Length < 16) return false;
                sawAnimationFrame = true;
            }

            offset += 8 + paddedLength;
        }
        return offset == bytes.Length && (sawImage || (sawAnimationHeader && sawAnimationFrame));
    }

    private static uint ReadUInt24LittleEndian(ReadOnlySpan<byte> bytes) =>
        (uint)(bytes[0] | bytes[1] << 8 | bytes[2] << 16);

    private static uint UpdateCrc32(uint crc, ReadOnlySpan<byte> bytes)
    {
        foreach (var value in bytes)
            crc = (crc >> 8) ^ Crc32Table[(crc ^ value) & 0xff];
        return crc;
    }

    private string GetUploadsRoot() =>
        Path.GetFullPath(Path.Combine(env.ContentRootPath, "uploads"));

    private static string ResolveInsideUploads(string uploadsRoot, string relativePath)
    {
        var normalizedRelative = relativePath
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar);
        var absolute = Path.GetFullPath(Path.Combine(uploadsRoot, normalizedRelative));
        var rootPrefix = uploadsRoot.EndsWith(Path.DirectorySeparatorChar)
            ? uploadsRoot
            : uploadsRoot + Path.DirectorySeparatorChar;
        var comparison = OperatingSystem.IsWindows()
            ? StringComparison.OrdinalIgnoreCase
            : StringComparison.Ordinal;
        if (!absolute.Equals(uploadsRoot, comparison) && !absolute.StartsWith(rootPrefix, comparison))
            throw new InvalidOperationException("Upload path must stay inside the configured uploads directory");
        return absolute;
    }
}
