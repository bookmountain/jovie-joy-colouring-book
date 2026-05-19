namespace JovieJoy.Api.Data.Entities;

public class NewsletterSubscriber
{
    public string Email { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
