using JovieJoy.Api.Services;

namespace JovieJoy.Api.Data.Entities;

public class NewsletterSubscriber
{
    public string Email { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string UnsubscribeToken { get; set; } = FreebieTokens.Generate();
    public DateTime? UnsubscribedAt { get; set; }
}
