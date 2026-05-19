namespace JovieJoy.Api.Data.Entities;

public class Wishlist
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string ProductSlug { get; set; } = null!;
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}
