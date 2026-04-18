using System.Security.Claims;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(
    IGoogleAuthService google,
    ITokenService tokens,
    IConfiguration config,
    AppDbContext db) : ControllerBase
{
    // Kicks off the OAuth flow — redirect to Google
    [HttpGet("google")]
    public IActionResult StartGoogle([FromQuery] string? returnTo = null)
    {
        var url = google.GetAuthorizationUrl(state: returnTo);
        return Redirect(url);
    }

    // Google redirects back here with ?code=...
    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback(
        [FromQuery] string code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        CancellationToken ct)
    {
        var webAppUrl = config["WebAppUrl"]!.TrimEnd('/');

        if (!string.IsNullOrEmpty(error))
            return Redirect($"{webAppUrl}/auth/callback?error={Uri.EscapeDataString(error)}");

        try
        {
            var user = await google.ExchangeCodeAsync(code, ct);
            var jwt = tokens.CreateJwt(user);
            var returnTo = string.IsNullOrWhiteSpace(state) ? "/" : state;
            return Redirect($"{webAppUrl}/auth/callback?token={Uri.EscapeDataString(jwt)}&returnTo={Uri.EscapeDataString(returnTo)}");
        }
        catch (Exception ex)
        {
            return Redirect($"{webAppUrl}/auth/callback?error={Uri.EscapeDataString(ex.Message)}");
        }
    }

    // Admin login — email + password
    [HttpPost("admin/login")]
    public async Task<ActionResult<AuthResponse>> AdminLogin(
        [FromBody] AdminLoginRequest req,
        CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(
            u => u.Email == req.Email && u.IsAdmin, ct);

        if (user is null || string.IsNullOrEmpty(user.PasswordHash) ||
            !PasswordHasher.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid credentials" });

        var jwt = tokens.CreateJwt(user);
        return Ok(new AuthResponse(jwt, UserDto.From(user)));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me(CancellationToken ct)
    {
        var sub = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(sub, out var userId)) return Unauthorized();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        return user is null ? Unauthorized() : Ok(UserDto.From(user));
    }
}
