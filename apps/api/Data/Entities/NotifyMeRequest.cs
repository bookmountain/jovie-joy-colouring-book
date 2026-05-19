namespace JovieJoy.Api.Data.Entities;

public class NotifyMeRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = null!;
    public string ProductSlug { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
