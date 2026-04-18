using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace JovieJoy.Api.Services;

public interface IGoogleAuthService
{
    string GetAuthorizationUrl(string? state = null);
    Task<User> ExchangeCodeAsync(string code, CancellationToken ct = default);
}

// OAuth2 + OIDC flow:
//   1. Frontend -> GET /auth/google  (server redirects to Google)
//   2. User approves at Google
//   3. Google -> GET /auth/google/callback?code=...
//   4. Server exchanges code for tokens, validates the OIDC id_token,
//      upserts User, issues our JWT, redirects to ${WebAppUrl}/auth/callback?token=...
public class GoogleAuthService(
    IConfiguration config,
    IHttpClientFactory httpFactory,
    AppDbContext db) : IGoogleAuthService
{
    private static readonly ConfigurationManager<OpenIdConnectConfiguration> _oidcConfig =
        new("https://accounts.google.com/.well-known/openid-configuration",
            new OpenIdConnectConfigurationRetriever(),
            new HttpDocumentRetriever { RequireHttps = true });

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

        // Exchange auth code for tokens
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

        var idToken = tokenDoc.RootElement.GetProperty("id_token").GetString()!;

        // Validate the OIDC id_token using Google's published JWKS
        var oidc = await _oidcConfig.GetConfigurationAsync(ct);
        var validationParams = new TokenValidationParameters
        {
            ValidIssuer = "https://accounts.google.com",
            ValidAudience = clientId,
            IssuerSigningKeys = oidc.SigningKeys,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),
        };

        var handler = new JwtSecurityTokenHandler();
        var principal = handler.ValidateToken(idToken, validationParams, out _);

        var googleId = principal.FindFirst("sub")?.Value
            ?? throw new InvalidOperationException("id_token missing 'sub'");
        var email = principal.FindFirst("email")?.Value
            ?? throw new InvalidOperationException("id_token missing 'email'");
        var name = principal.FindFirst("name")?.Value;
        var picture = principal.FindFirst("picture")?.Value;

        // Upsert — match by googleId first, fall back to email
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
