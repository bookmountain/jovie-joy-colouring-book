// Placeholder — split into per-domain DTO files in Task 9
// Kept here only so the project compiles for migration generation.
namespace JovieJoy.Api.Contracts;

public record UserDto(Guid Id, string Email, string? Name, string? AvatarUrl, bool IsAdmin)
{
    public static UserDto From(JovieJoy.Api.Data.Entities.User u) =>
        new(u.Id, u.Email, u.Name, u.AvatarUrl, u.IsAdmin);
}

public record AuthResponse(string Token, UserDto User);
public record AdminLoginRequest(string Email, string Password);
