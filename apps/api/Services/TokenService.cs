using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using JovieJoy.Api.Data.Entities;
using Microsoft.IdentityModel.Tokens;

namespace JovieJoy.Api.Services;

public interface ITokenService
{
    string CreateJwt(User user);
}

public class TokenService(IConfiguration config) : ITokenService
{
    public string CreateJwt(User user)
    {
        var secret = config["Jwt:Secret"]!;
        var issuer = config["Jwt:Issuer"] ?? "jovie-joy-api";
        var audience = config["Jwt:Audience"] ?? "jovie-joy-web";
        var expiryMinutes = int.TryParse(config["Jwt:ExpiryMinutes"], out var m) ? m : 60;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        if (!string.IsNullOrEmpty(user.Name))
            claims.Add(new Claim("name", user.Name));
        if (user.IsAdmin)
            claims.Add(new Claim(ClaimTypes.Role, "admin"));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
