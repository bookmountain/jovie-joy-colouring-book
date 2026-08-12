namespace JovieJoy.Api.Data.Entities;

/// <summary>
/// Durable completion marker for an application-managed data seed.
/// The row is written only after every seeder in that version has completed.
/// </summary>
public sealed class SeedState
{
    public string Key { get; set; } = null!;
    public int Version { get; set; }
    public DateTime CompletedAtUtc { get; set; }
}
