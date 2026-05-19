using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record UserDto(Guid Id, string Email, string? Name, string? AvatarUrl, bool IsAdmin)
{
    public static UserDto From(User u) => new(u.Id, u.Email, u.Name, u.AvatarUrl, u.IsAdmin);
}

public record AuthResponse(string Token, UserDto User);
public record AdminLoginRequest(string Email, string Password);
