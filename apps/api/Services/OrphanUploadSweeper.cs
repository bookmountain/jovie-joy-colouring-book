using JovieJoy.Api.Data;
using JovieJoy.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Services;

public sealed class OrphanUploadCleanupOptions
{
    /// <summary>
    /// Files newer than this are never swept. This protects uploads that an admin
    /// has received a URL for but has not yet attached to a CMS save.
    /// </summary>
    public TimeSpan MinimumAge { get; set; } = TimeSpan.FromHours(24);

    /// <summary>Delay before the first sweep after the API starts.</summary>
    public TimeSpan StartupDelay { get; set; } = TimeSpan.FromMinutes(5);

    /// <summary>Interval between subsequent best-effort sweeps.</summary>
    public TimeSpan Interval { get; set; } = TimeSpan.FromHours(24);
}

public sealed record OrphanUploadSweepResult(int FilesScanned, int FilesDeleted, int FilesPreserved);

/// <summary>
/// Deletes abandoned files only after an age grace period and a complete live-
/// reference scan. The sweep is intentionally best-effort; database/storage errors
/// leave files in place and are retried later.
/// </summary>
public sealed class OrphanUploadSweeper(
    AppDbContext db,
    IWebHostEnvironment environment,
    IAssetCleanupService assetCleanup,
    IUploadService uploads,
    ILogger<OrphanUploadSweeper> logger)
{
    public async Task<OrphanUploadSweepResult> SweepAsync(TimeSpan minimumAge, CancellationToken ct)
    {
        if (minimumAge < TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(nameof(minimumAge), "Minimum age cannot be negative.");

        var uploadsRoot = Path.GetFullPath(Path.Combine(environment.ContentRootPath, "uploads"));
        if (!Directory.Exists(uploadsRoot)) return new OrphanUploadSweepResult(0, 0, 0);

        // Hold the same lease used by admin mutations from the reference snapshot
        // through deletion. This closes the scan/save race locally and, on
        // PostgreSQL, across API replicas sharing the uploads volume.
        await using var mutationLease = await CmsMutationCoordination.AcquireAsync(db, ct);

        IReadOnlySet<string> referenced;
        try
        {
            var staleCheckoutCutoff = DateTime.UtcNow - AssetCleanupService.PendingCheckoutFileRetention;
            var stalePendingOrders = await db.Orders
                .Where(order => order.Status == Data.Entities.OrderStatus.Pending &&
                                order.CreatedAt < staleCheckoutCutoff)
                .ToListAsync(ct);
            if (stalePendingOrders.Count > 0)
            {
                foreach (var order in stalePendingOrders)
                    order.Status = Data.Entities.OrderStatus.Failed;
                await db.SaveChangesAsync(ct);
                logger.LogInformation(
                    "Marked {OrderCount} abandoned checkout orders failed during upload cleanup",
                    stalePendingOrders.Count);
            }

            referenced = await assetCleanup.ReadReferencedLocalUrlsAsync(ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Skipped orphan upload sweep because live references could not be read");
            return new OrphanUploadSweepResult(0, 0, 0);
        }

        var cutoffUtc = DateTime.UtcNow - minimumAge;
        var scanned = 0;
        var deleted = 0;
        var preserved = 0;

        IEnumerable<string> files;
        try
        {
            files = Directory.EnumerateFiles(
                uploadsRoot,
                "*",
                new EnumerationOptions
                {
                    RecurseSubdirectories = true,
                    ReturnSpecialDirectories = false,
                    IgnoreInaccessible = false,
                    AttributesToSkip = FileAttributes.ReparsePoint,
                });
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            logger.LogWarning(ex, "Skipped orphan upload sweep because the uploads directory could not be enumerated");
            return new OrphanUploadSweepResult(0, 0, 0);
        }

        try
        {
            foreach (var absolutePath in files)
            {
                ct.ThrowIfCancellationRequested();
                scanned++;

                string localUrl;
                DateTime lastWriteUtc;
                try
                {
                    var relative = Path.GetRelativePath(uploadsRoot, absolutePath);
                    if (relative.StartsWith("..", StringComparison.Ordinal) || Path.IsPathRooted(relative))
                    {
                        preserved++;
                        continue;
                    }

                    localUrl = "/uploads/" + relative.Replace(Path.DirectorySeparatorChar, '/');
                    lastWriteUtc = File.GetLastWriteTimeUtc(absolutePath);
                }
                catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
                {
                    preserved++;
                    logger.LogWarning(ex, "Could not inspect upload candidate {UploadPath}", absolutePath);
                    continue;
                }

                if (referenced.Contains(localUrl) || lastWriteUtc > cutoffUtc)
                {
                    preserved++;
                    continue;
                }

                // Delete through the storage abstraction so containment and logging
                // rules stay identical to targeted mutation cleanup.
                uploads.DeleteIfLocal(localUrl);
                if (!File.Exists(absolutePath)) deleted++;
                else preserved++;
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            logger.LogWarning(ex, "Orphan upload sweep stopped while enumerating files");
        }

        return new OrphanUploadSweepResult(scanned, deleted, preserved);
    }
}

/// <summary>
/// Periodic host for <see cref="OrphanUploadSweeper"/>. Each run creates a fresh
/// scope so its DbContext is never shared across iterations.
/// </summary>
public sealed class OrphanUploadCleanupHostedService(
    IServiceScopeFactory scopeFactory,
    Microsoft.Extensions.Options.IOptions<OrphanUploadCleanupOptions> options,
    ILogger<OrphanUploadCleanupHostedService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var configured = options.Value;
        if (configured.MinimumAge < TimeSpan.Zero || configured.StartupDelay < TimeSpan.Zero || configured.Interval <= TimeSpan.Zero)
        {
            logger.LogError("Orphan upload cleanup options are invalid; background cleanup is disabled");
            return;
        }

        try
        {
            await Task.Delay(configured.StartupDelay, stoppingToken);
            while (!stoppingToken.IsCancellationRequested)
            {
                await SweepOnceAsync(configured.MinimumAge, stoppingToken);
                await Task.Delay(configured.Interval, stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal host shutdown.
        }
    }

    private async Task SweepOnceAsync(TimeSpan minimumAge, CancellationToken ct)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var sweeper = scope.ServiceProvider.GetRequiredService<OrphanUploadSweeper>();
            var result = await sweeper.SweepAsync(minimumAge, ct);
            if (result.FilesDeleted > 0)
                logger.LogInformation("Removed {DeletedCount} orphan uploads after scanning {ScannedCount} files", result.FilesDeleted, result.FilesScanned);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Orphan upload cleanup failed; files were left for a later sweep");
        }
    }
}
