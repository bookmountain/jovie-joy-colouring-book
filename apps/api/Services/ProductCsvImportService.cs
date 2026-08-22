using System.Globalization;
using System.Text;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace JovieJoy.Api.Services;

public sealed class ProductCsvImportService(
    AppDbContext db,
    IAssetCleanupService assetCleanup,
    ILogger<ProductCsvImportService>? logger = null)
{
    private readonly ILogger<ProductCsvImportService>? _logger = logger ?? ResolveLogger(db);

    public const long MaxFileBytes = 2 * 1024 * 1024;
    public const long MaxMultipartBytes = MaxFileBytes + 64 * 1024;
    public const int MaxRows = 1000;
    public const int MaxFieldCharacters = 20_000;
    public const int MaxListItems = 100;

    private static readonly HashSet<string> AllowedColumns = new(StringComparer.Ordinal)
    {
        "slug", "title", "excerpt", "description", "price_cents", "price",
        "compare_at_price_cents", "compare_at_price", "currency", "available",
        "product_type", "images", "tags", "collections", "published_at",
    };

    private static readonly string[] RequiredColumns =
    [
        "slug", "title", "product_type",
    ];

    private static readonly HashSet<string> AllowedRemoteImageHosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "cdn.shopify.com",
        "cocowyo.com",
        "images.unsplash.com",
    };

    public async Task<ProductCsvImportResponse> ImportAsync(
        Stream csv,
        string mode,
        bool dryRun,
        CancellationToken ct)
    {
        mode = mode.Trim().ToLowerInvariant();
        if (mode is not ("create" or "upsert"))
            return EmptyResponse(dryRun, mode, "mode must be 'create' or 'upsert'.");

        ParsedCsv parsed;
        try
        {
            parsed = await ParseAsync(csv, ct);
        }
        catch (DecoderFallbackException)
        {
            return EmptyResponse(dryRun, mode, "The CSV must be valid UTF-8 text.");
        }

        if (parsed.GlobalErrors.Count > 0)
            return BuildResponse(parsed, dryRun, mode, importedCount: 0);

        var rowsBySlug = parsed.Rows
            .Where(row => row.Slug.Length > 0)
            .GroupBy(row => row.Slug, StringComparer.Ordinal)
            .Where(group => group.Count() > 1);
        foreach (var duplicate in rowsBySlug)
        {
            foreach (var row in duplicate)
                row.Errors.Add($"Duplicate slug '{duplicate.Key}' appears more than once in the CSV.");
        }

        var slugs = parsed.Rows
            .Where(row => row.Slug.Length > 0)
            .Select(row => row.Slug)
            .Distinct(StringComparer.Ordinal)
            .ToList();
        var existingProducts = await db.Products
            .Include(product => product.ProductCollections)
            .Where(product => slugs.Contains(product.Slug))
            .ToListAsync(ct);
        var existingBySlug = existingProducts.ToDictionary(product => product.Slug, StringComparer.Ordinal);

        var requestedCollectionSlugs = parsed.Rows
            .Where(row => row.HasCollections)
            .SelectMany(row => row.CollectionSlugs)
            .Distinct(StringComparer.Ordinal)
            .ToList();
        var collections = requestedCollectionSlugs.Count == 0
            ? new List<Collection>()
            : await db.Collections
                .Where(collection => requestedCollectionSlugs.Contains(collection.Slug))
                .ToListAsync(ct);
        var collectionsBySlug = collections.ToDictionary(collection => collection.Slug, StringComparer.Ordinal);

        foreach (var row in parsed.Rows)
        {
            existingBySlug.TryGetValue(row.Slug, out var existing);
            row.Existing = existing;
            row.Action = existing is null ? "create" : "update";

            if (mode == "create" && existing is not null)
                row.Errors.Add($"Product '{row.Slug}' already exists. Choose create or update to replace existing fields.");

            foreach (var collectionSlug in row.CollectionSlugs.Where(slug => !collectionsBySlug.ContainsKey(slug)))
                row.Errors.Add($"Collection '{collectionSlug}' does not exist.");

            var effectiveCompareAt = row.HasCompareAtPrice
                ? row.CompareAtPriceCents
                : existing?.CompareAtPriceCents;
            if (effectiveCompareAt.HasValue && effectiveCompareAt.Value < row.PriceCents)
                row.Errors.Add("compare_at_price_cents must be greater than or equal to price_cents.");

        }

        if (parsed.Rows.Any(row => row.Errors.Count > 0) || dryRun)
            return BuildResponse(parsed, dryRun, mode, importedCount: 0);

        var replacedImageCandidates = parsed.Rows
            .Where(row => row.HasImages && row.Existing is not null)
            .SelectMany(row => row.Existing!.Images)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        IDbContextTransaction? transaction = null;
        try
        {
            if (db.Database.IsRelational())
                transaction = await db.Database.BeginTransactionAsync(ct);

            var now = DateTime.UtcNow;
            foreach (var row in parsed.Rows)
            {
                if (row.Existing is null)
                {
                    var product = CreateProduct(row, now);
                    db.Products.Add(product);
                    row.Existing = product;
                }
                else
                {
                    UpdateProduct(row.Existing, row, now);
                }

                if (row.HasCollections)
                    SyncCollections(row.Existing, row.CollectionSlugs, collectionsBySlug);
            }

            await db.SaveChangesAsync(ct);
            if (transaction is not null)
                await transaction.CommitAsync(ct);
        }
        catch (DbUpdateException)
        {
            if (transaction is not null)
                await transaction.RollbackAsync(ct);
            parsed.GlobalErrors.Add("The catalog changed while the CSV was importing. Nothing was imported; preview the file again and retry.");
            return BuildResponse(parsed, dryRun: false, mode, importedCount: 0);
        }
        catch
        {
            if (transaction is not null)
                await transaction.RollbackAsync(ct);
            throw;
        }
        finally
        {
            if (transaction is not null)
                await transaction.DisposeAsync();
        }

        // The catalog is committed at this point. Upload cleanup is deliberately
        // outside the transaction failure path: a cancellation or transient storage/
        // database error may leave an orphan for a later retry, but must never claim
        // that an already-persisted import wrote nothing or try to roll it back.
        try
        {
            await assetCleanup.DeleteUnreferencedAsync(replacedImageCandidates, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(
                ex,
                "CSV import committed {ImportedCount} products, but cleanup of {CandidateCount} replaced image candidates did not complete",
                parsed.Rows.Count,
                replacedImageCandidates.Count);
        }

        return BuildResponse(parsed, dryRun: false, mode, parsed.Rows.Count);
    }

    private static ILogger<ProductCsvImportService>? ResolveLogger(AppDbContext context)
    {
        try
        {
            return (context.GetInfrastructure().GetService(typeof(ILoggerFactory)) as ILoggerFactory)
                ?.CreateLogger<ProductCsvImportService>();
        }
        catch (InvalidOperationException)
        {
            // Some direct/unit-test contexts do not expose an application logger.
            return null;
        }
    }

    private static Product CreateProduct(ParsedRow row, DateTime now) => new()
    {
        Slug = row.Slug,
        Title = row.Title,
        Excerpt = row.HasExcerpt ? row.Excerpt : "",
        Description = row.HasDescription ? row.Description : [],
        PriceCents = row.PriceCents,
        CompareAtPriceCents = row.HasCompareAtPrice ? row.CompareAtPriceCents : null,
        Available = row.HasAvailable ? row.Available : true,
        ProductType = row.ProductType,
        Images = row.HasImages ? row.Images : [],
        Options = [new ProductOption("Format", ["Default Title"])],
        SourceLinks = null,
        ReviewImages = null,
        InspirationImages = null,
        Tags = row.HasTags ? row.Tags : [],
        PublishedAt = row.HasPublishedAt ? row.PublishedAt : null,
        CreatedAt = now,
        UpdatedAt = now,
    };

    private static void UpdateProduct(Product product, ParsedRow row, DateTime now)
    {
        product.Title = row.Title;
        product.PriceCents = row.PriceCents;
        product.ProductType = row.ProductType;
        if (row.HasExcerpt) product.Excerpt = row.Excerpt;
        if (row.HasDescription) product.Description = row.Description;
        if (row.HasCompareAtPrice) product.CompareAtPriceCents = row.CompareAtPriceCents;
        if (row.HasAvailable) product.Available = row.Available;
        if (row.HasImages) product.Images = row.Images;
        if (row.HasTags) product.Tags = row.Tags;
        if (row.HasPublishedAt) product.PublishedAt = row.PublishedAt;
        product.UpdatedAt = now;
    }

    private void SyncCollections(
        Product product,
        IReadOnlyCollection<string> desiredSlugs,
        IReadOnlyDictionary<string, Collection> collectionsBySlug)
    {
        var desiredIds = desiredSlugs.Select(slug => collectionsBySlug[slug].Id).ToHashSet();
        var obsolete = product.ProductCollections
            .Where(link => !desiredIds.Contains(link.CollectionId))
            .ToList();
        db.ProductCollections.RemoveRange(obsolete);

        var existingIds = product.ProductCollections
            .Where(link => !obsolete.Contains(link))
            .Select(link => link.CollectionId)
            .ToHashSet();
        foreach (var collectionId in desiredIds.Where(id => !existingIds.Contains(id)))
        {
            product.ProductCollections.Add(new ProductCollection
            {
                Product = product,
                ProductId = product.Id,
                Collection = collectionsBySlug.Values.Single(collection => collection.Id == collectionId),
                CollectionId = collectionId,
            });
        }
    }

    private static async Task<ParsedCsv> ParseAsync(Stream stream, CancellationToken ct)
    {
        using var reader = new StreamReader(
            stream,
            new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true),
            detectEncodingFromByteOrderMarks: true,
            leaveOpen: true);
        var text = await reader.ReadToEndAsync(ct);
        var records = CsvParser.Parse(text, out var csvError);
        var parsed = new ParsedCsv();
        if (csvError is not null)
        {
            parsed.GlobalErrors.Add(csvError);
            return parsed;
        }

        records = records.Where(record => record.Fields.Any(field => !string.IsNullOrWhiteSpace(field))).ToList();
        if (records.Count == 0)
        {
            parsed.GlobalErrors.Add("The CSV is empty.");
            return parsed;
        }

        var headers = records[0].Fields.Select(NormalizeHeader).ToList();
        var duplicateHeaders = headers.GroupBy(header => header, StringComparer.Ordinal).Where(group => group.Count() > 1);
        foreach (var duplicate in duplicateHeaders)
            parsed.GlobalErrors.Add($"Header '{duplicate.Key}' appears more than once.");
        foreach (var required in RequiredColumns.Where(required => !headers.Contains(required, StringComparer.Ordinal)))
            parsed.GlobalErrors.Add($"Missing required header '{required}'.");
        if (!headers.Contains("price_cents", StringComparer.Ordinal) && !headers.Contains("price", StringComparer.Ordinal))
            parsed.GlobalErrors.Add("Missing required header 'price_cents' (or use 'price' for USD decimal values).");
        if (headers.Contains("price_cents", StringComparer.Ordinal) && headers.Contains("price", StringComparer.Ordinal))
            parsed.GlobalErrors.Add("Use either 'price_cents' or 'price', not both.");
        if (headers.Contains("compare_at_price_cents", StringComparer.Ordinal) && headers.Contains("compare_at_price", StringComparer.Ordinal))
            parsed.GlobalErrors.Add("Use either 'compare_at_price_cents' or 'compare_at_price', not both.");
        foreach (var unknown in headers.Where(header => !AllowedColumns.Contains(header)).Distinct(StringComparer.Ordinal))
            parsed.GlobalErrors.Add($"Unknown header '{unknown}'.");
        if (parsed.GlobalErrors.Count > 0)
            return parsed;

        var headerIndexes = headers.Select((header, index) => (header, index))
            .ToDictionary(pair => pair.header, pair => pair.index, StringComparer.Ordinal);
        var dataRecords = records.Skip(1).ToList();
        if (dataRecords.Count == 0)
        {
            parsed.GlobalErrors.Add("The CSV has headers but no product rows.");
            return parsed;
        }
        if (dataRecords.Count > MaxRows)
        {
            parsed.GlobalErrors.Add($"A CSV can contain at most {MaxRows} product rows.");
            return parsed;
        }

        foreach (var record in dataRecords)
        {
            if (record.Fields.Count != headers.Count)
            {
                parsed.Rows.Add(new ParsedRow(record.RowNumber)
                {
                    Errors = { $"Expected {headers.Count} columns but found {record.Fields.Count}." },
                });
                continue;
            }

            string Value(string column) => record.Fields[headerIndexes[column]].Trim();
            bool Has(string column) => headerIndexes.ContainsKey(column);
            var row = new ParsedRow(record.RowNumber)
            {
                Slug = NormalizeSlug(Value("slug")),
                Title = Value("title"),
                HasExcerpt = Has("excerpt"),
                Excerpt = Has("excerpt") ? Value("excerpt") : "",
                HasDescription = Has("description"),
                Description = Has("description") ? ParseList(Value("description"), caseInsensitive: false) : [],
                HasCompareAtPrice = Has("compare_at_price_cents"),
                HasAvailable = Has("available"),
                HasImages = Has("images"),
                Images = Has("images") ? ParseList(Value("images"), caseInsensitive: false) : [],
                HasTags = Has("tags"),
                Tags = Has("tags") ? ParseList(Value("tags"), caseInsensitive: true) : [],
                HasCollections = Has("collections"),
                CollectionSlugs = Has("collections")
                    ? ParseList(Value("collections"), caseInsensitive: true).Select(NormalizeSlug).Where(slug => slug.Length > 0).ToList()
                    : [],
                HasPublishedAt = Has("published_at"),
            };

            row.HasCompareAtPrice = Has("compare_at_price_cents") || Has("compare_at_price");

            foreach (var (value, index) in record.Fields.Select((value, index) => (value, index)))
            {
                if (value.Length > MaxFieldCharacters)
                    row.Errors.Add($"Column '{headers[index]}' exceeds the {MaxFieldCharacters:N0}-character limit.");
                if (value.Contains('\0'))
                    row.Errors.Add($"Column '{headers[index]}' contains an unsupported null character.");
            }

            if (row.Slug.Length == 0)
                row.Errors.Add("slug is required.");
            else if (row.Slug.Length > 200)
                row.Errors.Add("slug must be 200 characters or fewer.");
            if (row.Title.Length == 0)
                row.Errors.Add("title is required.");
            else if (row.Title.Length > 300)
                row.Errors.Add("title must be 300 characters or fewer.");
            if (row.Excerpt.Length > 1000)
                row.Errors.Add("excerpt must be 1000 characters or fewer.");

            var priceColumn = Has("price_cents") ? "price_cents" : "price";
            var priceIsCents = priceColumn == "price_cents";
            if (!TryParseMoney(Value(priceColumn), priceIsCents, out var price))
                row.Errors.Add(priceIsCents
                    ? "price_cents must be a non-negative whole number."
                    : "price must be a non-negative USD amount with at most two decimal places.");
            else
                row.PriceCents = price;

            if (Has("currency"))
            {
                var currency = Value("currency").ToUpperInvariant();
                if (currency.Length > 0 && currency != "USD")
                    row.Errors.Add("currency must be USD when provided.");
            }

            var type = Value("product_type").ToLowerInvariant();
            row.ProductType = type switch
            {
                "physical" => ProductType.Physical,
                "digital" => ProductType.Digital,
                "sticker" => ProductType.Sticker,
                _ => ProductType.Physical,
            };
            if (type is not ("physical" or "digital" or "sticker"))
                row.Errors.Add("product_type must be physical, digital, or sticker.");

            if (row.HasCompareAtPrice)
            {
                var compareColumn = Has("compare_at_price_cents") ? "compare_at_price_cents" : "compare_at_price";
                var compareIsCents = compareColumn == "compare_at_price_cents";
                var raw = Value(compareColumn);
                if (raw.Length == 0)
                    row.CompareAtPriceCents = null;
                else if (!TryParseMoney(raw, compareIsCents, out var compareAt))
                    row.Errors.Add(compareIsCents
                        ? "compare_at_price_cents must be blank or a non-negative whole number."
                        : "compare_at_price must be blank or a non-negative USD amount with at most two decimal places.");
                else
                    row.CompareAtPriceCents = compareAt;
            }

            if (row.HasAvailable)
            {
                var raw = Value("available").ToLowerInvariant();
                if (raw is "true" or "yes" or "1") row.Available = true;
                else if (raw is "false" or "no" or "0") row.Available = false;
                else row.Errors.Add("available must be true/false, yes/no, or 1/0.");
            }

            if (row.HasPublishedAt)
            {
                var raw = Value("published_at");
                if (raw.Length == 0)
                {
                    row.PublishedAt = null;
                }
                else if (DateTimeOffset.TryParse(
                    raw,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AllowWhiteSpaces | DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                    out var publishedAt))
                {
                    row.PublishedAt = publishedAt.UtcDateTime;
                }
                else
                {
                    row.Errors.Add("published_at must be blank or an ISO-8601 date/time.");
                }
            }

            ValidateList(row, "description", row.Description, maxItemLength: 5000);
            ValidateList(row, "images", row.Images, maxItemLength: 2048);
            ValidateList(row, "tags", row.Tags, maxItemLength: 100);
            ValidateList(row, "collections", row.CollectionSlugs, maxItemLength: 200);
            foreach (var image in row.Images.Where(image => !IsSupportedImageUrl(image)))
                row.Errors.Add($"Image '{image}' must use /uploads/... or HTTPS on an approved image host.");
            RejectSpreadsheetFormula(row, "title", [row.Title]);
            if (row.HasExcerpt) RejectSpreadsheetFormula(row, "excerpt", [row.Excerpt]);
            if (row.HasDescription) RejectSpreadsheetFormula(row, "description", row.Description);
            if (row.HasImages) RejectSpreadsheetFormula(row, "images", row.Images);
            if (row.HasTags) RejectSpreadsheetFormula(row, "tags", row.Tags);

            parsed.Rows.Add(row);
        }

        return parsed;
    }

    private static string NormalizeHeader(string value)
    {
        var normalized = value
            .TrimStart('\uFEFF')
            .Trim()
            .ToLowerInvariant()
            .Replace('-', '_')
            .Replace(' ', '_');
        return normalized switch
        {
            "producttype" => "product_type",
            "pricecents" => "price_cents",
            "compareatpricecents" => "compare_at_price_cents",
            "compareatprice" => "compare_at_price",
            "publishedat" => "published_at",
            _ => normalized,
        };
    }

    private static string NormalizeSlug(string value)
    {
        var normalized = new StringBuilder(value.Length);
        var previousHyphen = false;
        foreach (var character in value.Trim().ToLowerInvariant())
        {
            if (character is >= 'a' and <= 'z' or >= '0' and <= '9')
            {
                normalized.Append(character);
                previousHyphen = false;
            }
            else if (!previousHyphen && normalized.Length > 0)
            {
                normalized.Append('-');
                previousHyphen = true;
            }
        }
        return normalized.ToString().Trim('-');
    }

    private static List<string> ParseList(string value, bool caseInsensitive)
    {
        var comparer = caseInsensitive ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal;
        return value.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(item => item.Length > 0)
            .Distinct(comparer)
            .ToList();
    }

    private static bool TryParseMoney(string raw, bool cents, out int value)
    {
        value = 0;
        if (cents)
            return int.TryParse(raw, NumberStyles.None, CultureInfo.InvariantCulture, out value) && value >= 0;

        var normalized = raw.Trim();
        if (normalized.StartsWith("USD", StringComparison.OrdinalIgnoreCase))
            normalized = normalized[3..].Trim();
        if (normalized.EndsWith("USD", StringComparison.OrdinalIgnoreCase))
            normalized = normalized[..^3].Trim();
        if (normalized.StartsWith('$')) normalized = normalized[1..].Trim();

        if (!decimal.TryParse(
            normalized,
            NumberStyles.AllowDecimalPoint | NumberStyles.AllowThousands,
            CultureInfo.InvariantCulture,
            out var dollars) || dollars < 0)
            return false;
        var centsValue = dollars * 100m;
        if (centsValue != decimal.Truncate(centsValue) || centsValue > int.MaxValue)
            return false;
        value = (int)centsValue;
        return true;
    }

    private static void ValidateList(ParsedRow row, string column, List<string> values, int maxItemLength)
    {
        if (values.Count > MaxListItems)
            row.Errors.Add($"{column} can contain at most {MaxListItems} pipe-separated values.");
        if (values.Any(value => value.Length > maxItemLength))
            row.Errors.Add($"Each {column} value must be {maxItemLength:N0} characters or fewer.");
    }

    private static bool IsSupportedImageUrl(string value)
    {
        if (value.StartsWith("/uploads/", StringComparison.Ordinal) &&
            !value.Contains('\\') &&
            !value.Contains("..", StringComparison.Ordinal))
            return true;

        return Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
               uri.Scheme == Uri.UriSchemeHttps &&
               string.IsNullOrEmpty(uri.UserInfo) &&
               uri.Port == 443 &&
               AllowedRemoteImageHosts.Contains(uri.Host);
    }

    private static void RejectSpreadsheetFormula(ParsedRow row, string column, IEnumerable<string> values)
    {
        if (values.Any(value => value.TrimStart().StartsWith('=') ||
                                value.TrimStart().StartsWith('+') ||
                                value.TrimStart().StartsWith('-') ||
                                value.TrimStart().StartsWith('@')))
            row.Errors.Add($"{column} cannot begin with =, +, -, or @ because spreadsheet applications may execute it as a formula.");
    }

    private static ProductCsvImportResponse EmptyResponse(bool dryRun, string mode, string error) => new(
        Valid: false,
        DryRun: dryRun,
        Mode: mode,
        TotalRows: 0,
        CreateCount: 0,
        UpdateCount: 0,
        ImportedCount: 0,
        Errors: [error],
        Rows: []);

    private static ProductCsvImportResponse BuildResponse(
        ParsedCsv parsed,
        bool dryRun,
        string mode,
        int importedCount)
    {
        var valid = parsed.GlobalErrors.Count == 0 && parsed.Rows.All(row => row.Errors.Count == 0);
        return new ProductCsvImportResponse(
            Valid: valid,
            DryRun: dryRun,
            Mode: mode,
            TotalRows: parsed.Rows.Count,
            CreateCount: parsed.Rows.Count(row => row.Errors.Count == 0 && row.Action == "create"),
            UpdateCount: parsed.Rows.Count(row => row.Errors.Count == 0 && row.Action == "update"),
            ImportedCount: importedCount,
            Errors: parsed.GlobalErrors,
            Rows: parsed.Rows.Select(row => new ProductCsvImportRowResult(
                row.RowNumber,
                row.Slug,
                row.Title,
                row.Errors.Count > 0 ? "invalid" : row.Action,
                row.Errors)).ToList());
    }

    private sealed class ParsedCsv
    {
        public List<string> GlobalErrors { get; } = [];
        public List<ParsedRow> Rows { get; } = [];
    }

    private sealed class ParsedRow(int rowNumber)
    {
        public int RowNumber { get; } = rowNumber;
        public string Slug { get; set; } = "";
        public string Title { get; set; } = "";
        public int PriceCents { get; set; }
        public ProductType ProductType { get; set; }
        public bool HasExcerpt { get; set; }
        public string Excerpt { get; set; } = "";
        public bool HasDescription { get; set; }
        public List<string> Description { get; set; } = [];
        public bool HasCompareAtPrice { get; set; }
        public int? CompareAtPriceCents { get; set; }
        public bool HasAvailable { get; set; }
        public bool Available { get; set; } = true;
        public bool HasImages { get; set; }
        public List<string> Images { get; set; } = [];
        public bool HasTags { get; set; }
        public List<string> Tags { get; set; } = [];
        public bool HasCollections { get; set; }
        public List<string> CollectionSlugs { get; set; } = [];
        public bool HasPublishedAt { get; set; }
        public DateTime? PublishedAt { get; set; }
        public Product? Existing { get; set; }
        public string Action { get; set; } = "create";
        public List<string> Errors { get; } = [];
    }

    private sealed record CsvRecord(int RowNumber, List<string> Fields);

    private static class CsvParser
    {
        public static List<CsvRecord> Parse(string text, out string? error)
        {
            var records = new List<CsvRecord>();
            var fields = new List<string>();
            var field = new StringBuilder();
            var inQuotes = false;
            var quoteClosed = false;
            var line = 1;
            var recordLine = 1;
            error = null;

            void EndField()
            {
                fields.Add(field.ToString());
                field.Clear();
                quoteClosed = false;
            }

            void EndRecord()
            {
                EndField();
                records.Add(new CsvRecord(recordLine, fields.ToList()));
                fields.Clear();
            }

            for (var index = 0; index < text.Length; index++)
            {
                var character = text[index];
                if (inQuotes)
                {
                    if (character == '"')
                    {
                        if (index + 1 < text.Length && text[index + 1] == '"')
                        {
                            field.Append('"');
                            index++;
                        }
                        else
                        {
                            inQuotes = false;
                            quoteClosed = true;
                        }
                    }
                    else
                    {
                        field.Append(character);
                        if (character == '\n') line++;
                    }
                    continue;
                }

                if (quoteClosed)
                {
                    if (character == ',')
                    {
                        EndField();
                        continue;
                    }
                    if (character is '\r' or '\n')
                    {
                        if (character == '\r' && index + 1 < text.Length && text[index + 1] == '\n') index++;
                        EndRecord();
                        line++;
                        recordLine = line;
                        continue;
                    }
                    if (char.IsWhiteSpace(character)) continue;
                    error = $"Unexpected character after a closing quote on row {recordLine}.";
                    return [];
                }

                if (character == '"')
                {
                    if (field.Length > 0)
                    {
                        error = $"Unexpected quote in an unquoted field on row {recordLine}.";
                        return [];
                    }
                    inQuotes = true;
                }
                else if (character == ',')
                {
                    EndField();
                }
                else if (character is '\r' or '\n')
                {
                    if (character == '\r' && index + 1 < text.Length && text[index + 1] == '\n') index++;
                    EndRecord();
                    line++;
                    recordLine = line;
                }
                else
                {
                    field.Append(character);
                }
            }

            if (inQuotes)
            {
                error = $"Unclosed quoted field starting on row {recordLine}.";
                return [];
            }
            if (field.Length > 0 || fields.Count > 0 || quoteClosed)
                EndRecord();

            return records;
        }
    }
}
