using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using System.Data;
using System.Security.Cryptography;
using System.Text;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/navigation")]
[Authorize(Policy = "AdminOnly")]
public class AdminNavigationController(
    AppDbContext db,
    IAssetCleanupService assetCleanup) : ControllerBase
{
    private const int MaxItems = 200;
    private const int MaxDepth = 3;
    private const int MaxSiblings = 40;

    [HttpGet]
    public async Task<ActionResult<AdminNavigationResponse>> List(CancellationToken ct)
    {
        var items = await ReadItemsAsync(ct);
        return Ok(new AdminNavigationResponse(items, CalculateRevision(items)));
    }

    [HttpPut]
    public async Task<ActionResult<AdminNavigationResponse>> Replace(
        [FromBody] ReplaceAdminNavigationRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ExpectedRevision))
            return BadRequest(new { error = "ExpectedRevision is required." });
        var validationError = Validate(request.Items);
        if (validationError is not null)
            return BadRequest(new { error = validationError });

        IDbContextTransaction? transaction = null;
        if (db.Database.IsRelational())
            transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

        try
        {
            var existing = await db.NavLinks.ToListAsync(ct);
            var previousHrefs = existing.Select(item => item.Href).ToList();
            var previousEnabled = existing.ToDictionary(item => item.Id, item => item.Enabled);
            var currentItems = existing
                .Select(ToDto)
                .OrderBy(item => item.ParentId)
                .ThenBy(item => item.SortIndex)
                .ThenBy(item => item.Label)
                .ToList();
            var currentRevision = CalculateRevision(currentItems);
            if (!CryptographicOperations.FixedTimeEquals(
                    Encoding.ASCII.GetBytes(currentRevision),
                    Encoding.ASCII.GetBytes(request.ExpectedRevision.Trim().ToLowerInvariant())))
            {
                if (transaction is not null)
                    await transaction.RollbackAsync(ct);
                return Conflict(new
                {
                    error = "Navigation changed since this editor loaded it. Reload before saving.",
                    currentRevision,
                });
            }

            db.NavLinks.RemoveRange(existing);
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();

            var replacements = request.Items.Select(item => new NavLink
            {
                Id = item.Id,
                Label = item.Label.Trim(),
                Href = item.Href.Trim(),
                SortIndex = item.SortIndex,
                Enabled = item.Enabled ?? previousEnabled.GetValueOrDefault(item.Id, true),
            }).ToList();
            var replacementsById = replacements.ToDictionary(item => item.Id);
            foreach (var requestItem in request.Items.Where(item => item.ParentId.HasValue))
            {
                // Set the relationship itself, rather than only the FK. EF can then
                // topologically order INSERTs even when the request lists children first.
                replacementsById[requestItem.Id].Parent = replacementsById[requestItem.ParentId!.Value];
            }
            db.NavLinks.AddRange(replacements);
            await db.SaveChangesAsync(ct);

            if (transaction is not null)
                await transaction.CommitAsync(ct);

            await assetCleanup.DeleteUnreferencedAsync(previousHrefs, ct);

            var savedItems = replacements
                .OrderBy(item => item.ParentId)
                .ThenBy(item => item.SortIndex)
                .ThenBy(item => item.Label)
                .Select(ToDto)
                .ToList();
            return Ok(new AdminNavigationResponse(savedItems, CalculateRevision(savedItems)));
        }
        catch (Exception ex) when (IsSerializationFailure(ex))
        {
            if (transaction is not null)
            {
                try { await transaction.RollbackAsync(CancellationToken.None); }
                catch (InvalidOperationException) { }
            }
            db.ChangeTracker.Clear();
            return Conflict(new
            {
                error = "Navigation changed while this save was in progress. Reload before saving again.",
            });
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
    }

    private async Task<List<AdminNavigationItemDto>> ReadItemsAsync(CancellationToken ct) =>
        await db.NavLinks.AsNoTracking()
            .OrderBy(item => item.ParentId)
            .ThenBy(item => item.SortIndex)
            .ThenBy(item => item.Label)
            .Select(item => new AdminNavigationItemDto(
                item.Id,
                item.ParentId,
                item.Label,
                item.Href,
                item.SortIndex,
                item.Enabled))
            .ToListAsync(ct);

    private static AdminNavigationItemDto ToDto(NavLink item) =>
        new(item.Id, item.ParentId, item.Label, item.Href, item.SortIndex, item.Enabled);

    private static bool IsSerializationFailure(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
            if (current is PostgresException { SqlState: "40001" }) return true;
        return false;
    }

    private static string CalculateRevision(IEnumerable<AdminNavigationItemDto> items)
    {
        // Length-prefix variable fields so no label/href content can produce an
        // ambiguous canonical byte stream. Sorting by id makes request order irrelevant.
        var canonical = new StringBuilder();
        foreach (var item in items.OrderBy(item => item.Id))
        {
            canonical.Append(item.Id.ToString("N")).Append('|')
                .Append(item.ParentId?.ToString("N") ?? "root").Append('|')
                .Append(item.SortIndex).Append('|')
                .Append(item.Enabled ?? true).Append('|')
                .Append(item.Label.Length).Append(':').Append(item.Label).Append('|')
                .Append(item.Href.Length).Append(':').Append(item.Href).Append('\n');
        }
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical.ToString())))
            .ToLowerInvariant();
    }

    private static string? Validate(IReadOnlyList<AdminNavigationItemDto>? items)
    {
        if (items is null)
            return "Items are required.";
        if (items.Count == 0)
            return "Navigation must contain at least one link.";
        if (items.Count > MaxItems)
            return $"Navigation cannot contain more than {MaxItems} links.";

        var byId = new Dictionary<Guid, AdminNavigationItemDto>();
        foreach (var item in items)
        {
            if (item.Id == Guid.Empty)
                return "Every navigation link requires a non-empty id.";
            if (!byId.TryAdd(item.Id, item))
                return $"Navigation link id '{item.Id}' is duplicated.";
            if (string.IsNullOrWhiteSpace(item.Label) || item.Label.Trim().Length > 120)
                return "Every navigation label must contain 1 to 120 characters.";
            if (!IsSafeHref(item.Href))
                return $"Navigation href '{item.Href}' must be a local path or an http(s) URL.";
            if (item.SortIndex is < 0 or > 10_000)
                return "Sort indexes must be between 0 and 10000.";
        }

        foreach (var item in items)
        {
            if (item.ParentId == item.Id)
                return $"Navigation link '{item.Label}' cannot be its own parent.";
            if (item.ParentId.HasValue && !byId.ContainsKey(item.ParentId.Value))
                return $"Navigation link '{item.Label}' references a missing parent.";
        }

        foreach (var siblingGroup in items.GroupBy(item => item.ParentId))
        {
            if (siblingGroup.Count() > MaxSiblings)
                return $"A navigation level cannot contain more than {MaxSiblings} links.";
            if (siblingGroup.GroupBy(item => item.SortIndex).Any(group => group.Count() > 1))
                return "Sibling navigation links must have unique sort indexes.";
        }

        foreach (var item in items)
        {
            var visited = new HashSet<Guid>();
            var cursor = item;
            var depth = 1;
            while (cursor.ParentId.HasValue)
            {
                if (!visited.Add(cursor.Id))
                    return "Navigation parent relationships contain a cycle.";
                cursor = byId[cursor.ParentId.Value];
                depth += 1;
                if (depth > MaxDepth)
                    return $"Navigation supports at most {MaxDepth} levels.";
            }
        }

        return null;
    }

    private static bool IsSafeHref(string? href)
    {
        if (string.IsNullOrWhiteSpace(href))
            return false;
        var value = href.Trim();
        if (value.Length > 500 || value.Contains('\\') || value.Any(char.IsControl) || value.Any(char.IsWhiteSpace))
            return false;
        if (value.StartsWith('/') && !value.StartsWith("//", StringComparison.Ordinal))
            return true;
        return Uri.TryCreate(value, UriKind.Absolute, out var absolute) &&
               (absolute.Scheme == Uri.UriSchemeHttp || absolute.Scheme == Uri.UriSchemeHttps);
    }
}
