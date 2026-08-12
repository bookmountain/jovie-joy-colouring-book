using JovieJoy.Api.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JovieJoy.Api.Infrastructure;

/// <summary>
/// One lease shared by admin writes and background storage maintenance. The
/// in-process gate covers every database provider; PostgreSQL's advisory lock
/// extends the same critical section across API replicas that share uploads.
/// </summary>
public static class CmsMutationCoordination
{
    private const long AdvisoryLockKey = 0x4A4F564945434D53; // "JOVIECMS"
    private static readonly SemaphoreSlim ProcessGate = new(1, 1);

    public static async ValueTask<IAsyncDisposable> AcquireAsync(AppDbContext db, CancellationToken ct)
    {
        await ProcessGate.WaitAsync(ct);
        NpgsqlConnection? postgresConnection = null;
        try
        {
            if (db.Database.ProviderName?.Contains("Npgsql", StringComparison.Ordinal) == true)
            {
                var connectionString = db.Database.GetConnectionString()
                    ?? throw new InvalidOperationException("The PostgreSQL connection string is unavailable.");
                postgresConnection = new NpgsqlConnection(connectionString);
                await postgresConnection.OpenAsync(ct);
                await using var acquire = new NpgsqlCommand(
                    "SELECT pg_advisory_lock(@lock_key)",
                    postgresConnection);
                acquire.Parameters.AddWithValue("lock_key", AdvisoryLockKey);
                await acquire.ExecuteScalarAsync(ct);
            }

            return new Lease(postgresConnection);
        }
        catch
        {
            if (postgresConnection is not null)
                await postgresConnection.DisposeAsync();
            ProcessGate.Release();
            throw;
        }
    }

    private sealed class Lease(NpgsqlConnection? postgresConnection) : IAsyncDisposable
    {
        private int _disposed;

        public async ValueTask DisposeAsync()
        {
            if (Interlocked.Exchange(ref _disposed, 1) != 0) return;
            try
            {
                if (postgresConnection is not null)
                {
                    try
                    {
                        await using var release = new NpgsqlCommand(
                            "SELECT pg_advisory_unlock(@lock_key)",
                            postgresConnection);
                        release.Parameters.AddWithValue("lock_key", AdvisoryLockKey);
                        await release.ExecuteScalarAsync(CancellationToken.None);
                    }
                    catch (Exception)
                    {
                        // Closing a PostgreSQL session releases its advisory locks.
                    }

                    await postgresConnection.DisposeAsync();
                }
            }
            finally
            {
                ProcessGate.Release();
            }
        }
    }
}
