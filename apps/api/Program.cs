using System.IdentityModel.Tokens.Jwt;
using System.Threading.RateLimiting;
using System.Text;
using DotNetEnv;
using JovieJoy.Api.Data;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Stripe;

// Explicit process/container environment always wins over developer convenience
// files. This also keeps isolated test/smoke configuration from being silently
// replaced by an ancestor .env discovered through traversal.
if (System.IO.File.Exists(".env.local"))
    Env.NoClobber().Load(".env.local");
else
    Env.NoClobber().TraversePath().Load();

JwtSecurityTokenHandler.DefaultMapInboundClaims = false;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

// ----- Database -----
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings__Default is required");
builder.Services.AddDbContext<AppDbContext>(opts => opts.UseNpgsql(connectionString));

// ----- JWT auth -----
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt__Secret is required (32+ chars)");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "jovie-joy-api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "jovie-joy-web";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(2),
    };
});

builder.Services.AddAuthorization(opts =>
{
    opts.AddPolicy("AdminOnly", p => p.RequireRole("admin"));
});
var adminLoginPermitLimit = Math.Clamp(
    builder.Configuration.GetValue<int?>("RateLimiting:AdminLogin:PermitLimit") ?? 5,
    1,
    1_000);
var adminLoginWindowSeconds = Math.Clamp(
    builder.Configuration.GetValue<int?>("RateLimiting:AdminLogin:WindowSeconds") ?? 60,
    1,
    3_600);
var checkoutPermitLimit = Math.Clamp(
    builder.Configuration.GetValue<int?>("RateLimiting:Checkout:PermitLimit") ?? 10,
    1,
    1_000);
var checkoutWindowSeconds = Math.Clamp(
    builder.Configuration.GetValue<int?>("RateLimiting:Checkout:WindowSeconds") ?? 60,
    1,
    86_400);
var freebieRequestPermitLimit = Math.Clamp(
    builder.Configuration.GetValue<int?>("RateLimiting:FreebieRequest:PermitLimit") ?? 5,
    1,
    1_000);
var freebieRequestWindowSeconds = Math.Clamp(
    builder.Configuration.GetValue<int?>("RateLimiting:FreebieRequest:WindowSeconds") ?? 3_600,
    1,
    86_400);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("admin-login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = adminLoginPermitLimit,
                QueueLimit = 0,
                Window = TimeSpan.FromSeconds(adminLoginWindowSeconds),
            }));
    options.AddPolicy("checkout", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = checkoutPermitLimit,
                QueueLimit = 0,
                Window = TimeSpan.FromSeconds(checkoutWindowSeconds),
            }));
    options.AddPolicy("freebie-request", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = freebieRequestPermitLimit,
                QueueLimit = 0,
                Window = TimeSpan.FromSeconds(freebieRequestWindowSeconds),
            }));
});
var trustedProxyAddresses = builder.Configuration
    .GetSection("ForwardedHeaders:KnownProxies")
    .Get<string[]>() ?? [];
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownProxies.Clear();
    options.KnownNetworks.Clear();
    foreach (var rawAddress in trustedProxyAddresses.Where(address => !string.IsNullOrWhiteSpace(address)))
    {
        if (!System.Net.IPAddress.TryParse(rawAddress, out var address))
            throw new InvalidOperationException($"ForwardedHeaders__KnownProxies contains invalid IP address '{rawAddress}'.");
        options.KnownProxies.Add(address);
    }
});

// ----- App services -----
builder.Services.AddScoped<ITokenService, JovieJoy.Api.Services.TokenService>();
builder.Services.AddScoped<IUploadService, UploadService>();
builder.Services.AddScoped<IAssetCleanupService, AssetCleanupService>();
builder.Services.AddScoped<IGoogleAuthService, GoogleAuthService>();
builder.Services.AddScoped<IStripeService, StripeService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddHttpClient();

// Missing production email configuration must fail the individual delivery
// attempt, not take the catalog and CMS offline. ResendEmailSender enforces the
// API key at the send boundary, and callers preserve a retryable delivery state.
builder.Services.Configure<ResendOptions>(builder.Configuration.GetSection("Resend"));
builder.Services.Configure<FreebiesOptions>(builder.Configuration.GetSection("Freebies"));
builder.Services.Configure<ProductDownloadsOptions>(builder.Configuration.GetSection("ProductDownloads"));
builder.Services.AddOptions<FreebiesOptions>()
    .Validate(options =>
        builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Test") ||
        (Uri.TryCreate(options.BaseUrl, UriKind.Absolute, out var uri) &&
         uri.Scheme == Uri.UriSchemeHttps &&
         !uri.IsLoopback),
        "Freebies__BaseUrl must be a public HTTPS API origin outside Development/Test.")
    .ValidateOnStart();
builder.Services.Configure<OrphanUploadCleanupOptions>(builder.Configuration.GetSection("OrphanUploadCleanup"));
builder.Services.AddScoped<OrphanUploadSweeper>();
builder.Services.AddHostedService<OrphanUploadCleanupHostedService>();
builder.Services.AddHttpClient<IEmailSender, ResendEmailSender>();

StripeConfiguration.ApiKey = builder.Configuration["Stripe:SecretKey"]
    ?? throw new InvalidOperationException("Stripe__SecretKey is required");

// ----- CORS -----
var webAppUrl = builder.Configuration["WebAppUrl"] ?? "http://localhost:3000";
builder.Services.AddCors(opts =>
{
    opts.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .WithExposedHeaders("Content-Disposition");
        if (builder.Environment.IsDevelopment())
            // Local dev: allow any loopback origin (Next dev :3000, Playwright :3100, etc.).
            policy.SetIsOriginAllowed(origin => Uri.TryCreate(origin, UriKind.Absolute, out var u) && u.IsLoopback);
        else
            policy.WithOrigins(webAppUrl);
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Global error handling: log the full exception + return a JSON body with a traceId
// instead of a bare empty 500.
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<JovieJoy.Api.Infrastructure.GlobalExceptionHandler>();

var app = builder.Build();

// Must run before the rest of the pipeline so it catches everything downstream.
app.UseExceptionHandler();

// ----- Migrations + seed on startup -----
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var cfg = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    if (db.Database.IsRelational())
        db.Database.Migrate();
    else
        await db.Database.EnsureCreatedAsync();
    if (!app.Environment.IsEnvironment("Test"))
        await DbSeeder.SeedAsync(db, cfg);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Serve uploaded files (PDFs, images) from /uploads
var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads",
    OnPrepareResponse = context =>
    {
        // Paid product PDFs are capabilities protected by ProductDownloadGrant.
        // Never expose their backing files through the anonymous static tree.
        if (context.Context.Request.Path.StartsWithSegments("/uploads/pdfs") ||
            context.Context.Request.Path.StartsWithSegments("/uploads/freebies/files"))
        {
            context.Context.Response.StatusCode = StatusCodes.Status404NotFound;
            context.Context.Response.ContentLength = 0;
            context.Context.Response.Body = Stream.Null;
            return;
        }

        context.Context.Response.Headers.XContentTypeOptions = "nosniff";
    },
});

app.UseForwardedHeaders();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<JovieJoy.Api.Infrastructure.AdminMutationLockMiddleware>();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

app.Run();

public partial class Program { }
