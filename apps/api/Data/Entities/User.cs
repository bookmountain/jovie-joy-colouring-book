namespace JovieJoy.Api.Data.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = null!;
    public string? Name { get; set; }
    public string? GoogleId { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsAdmin { get; set; } = false;
    // PBKDF2 hash — only set for admin accounts that use password login
    public string? PasswordHash { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
