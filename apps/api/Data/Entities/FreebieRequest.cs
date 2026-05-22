namespace JovieJoy.Api.Data.Entities;

public class FreebieRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FreebieId { get; set; }
    public Freebie Freebie { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Token { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public bool OptedIntoNewsletter { get; set; }
    public int DownloadCount { get; set; }
    public DateTime? FirstDownloadedAt { get; set; }
    public DateTime? LastDownloadedAt { get; set; }
    public string? Ip { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
