using System.Text.Json;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Services;

public interface IGoogleAuthService
{
    string GetAuthorizationUrl(string? state = null);
    Task<User> ExchangeCodeAsync(string code, CancellationToken ct = default);
}

// Manual OAuth2 implementation — simpler and more transparent than wiring up
// the AspNetCore.Authentication.Google handler for a pure-API flow.
//
// Flow:
//   1. Frontend -> GET /auth/google       (server redirects to Google)
//   2. User approves at Google
//   3. Google -> GET /auth/google/callback?code=...
//   4. Server exchanges code for tokens, fetches userinfo, upserts User,
//      issues our JWT, redirects to ${WebAppUrl}/auth/callback?token=...
public class GoogleAuthService(
    IConfiguration config,
    IHttpClientFactory httpFactory,
    AppDbContext db) : IGoogleAuthService
{
    public string GetAuthorizationUrl(string? state = null)
    {
        var clientId = config["Google:ClientId"]!;
        var redirectUri = config["Google:RedirectUri"]!;
        var scope = Uri.EscapeDataString("openid email profile");
        var qs = $"?client_id={Uri.EscapeDataString(clientId)}" +
                 $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
                 $"&response_type=code" +
                 $"&scope={scope}" +
                 $"&access_type=offline" +
                 $"&prompt=consent";
        if (!string.IsNullOrEmpty(state))
            qs += $"&state={Uri.EscapeDataString(state)}";
        return "https://accounts.google.com/o/oauth2/v2/auth" + qs;
    }

    public async Task<User> ExchangeCodeAsync(string code, CancellationToken ct = default)
    {
        var clientId = config["Google:ClientId"]!;
        var clientSecret = config["Google:ClientSecret"]!;
        var redirectUri = config["Google:RedirectUri"]!;

        using var http = httpFactory.CreateClient();

        var tokenResp = await http.PostAsync(
            "https://oauth2.googleapis.com/token",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["code"] = code,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"] = redirectUri,
                ["grant_type"] = "authorization_code",
            }), ct);

        tokenResp.EnsureSuccessStatusCode();
        var tokenJson = await tokenResp.Content.ReadAsStringAsync(ct);
        using var tokenDoc = JsonDocument.Parse(tokenJson);
        var accessToken = tokenDoc.RootElement.GetProperty("access_token").GetString()!;

        var userResp = await http.GetAsync(
            $"https://www.googleapis.com/oauth2/v3/userinfo?access_token={Uri.EscapeDataString(accessToken)}", ct);
        userResp.EnsureSuccessStatusCode();
        var userJson = await userResp.Content.ReadAsStringAsync(ct);
        using var userDoc = JsonDocument.Parse(userJson);

        var googleId = userDoc.RootElement.GetProperty("sub").GetString()!;
        var email = userDoc.RootElement.GetProperty("email").GetString()!;
        var name = userDoc.RootElement.TryGetProperty("name", out var n) ? n.GetString() : null;
        var picture = userDoc.RootElement.TryGetProperty("picture", out var p) ? p.GetString() : null;

        // Upsert — try to match by googleId first, then fall back to email
        var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId, ct);
        user ??= await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        if (user is null)
        {
            user = new User
            {
                Email = email,
                Name = name,
                GoogleId = googleId,
                AvatarUrl = picture,
            };
            db.Users.Add(user);
        }
        else
        {
            user.GoogleId ??= googleId;
            user.Name ??= name;
            user.AvatarUrl ??= picture;
        }

        await db.SaveChangesAsync(ct);
        return user;
    }
}
