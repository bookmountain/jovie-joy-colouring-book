using System.Text;
using DotNetEnv;
using JovieJoy.Api.Data;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Stripe;

// Load .env file if present (development convenience; prod uses real env vars)
Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// Allow configuration from environment variables using the __ separator
// (e.g. Jwt__Secret -> Jwt:Secret). AddEnvironmentVariables is already added
// by CreateBuilder, this is just a reminder of the convention.
builder.Configuration.AddEnvironmentVariables();

// ----- Database -----
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings__Default is required");

builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(connectionString));

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

builder.Services.AddAuthorization();

// ----- App services -----
builder.Services.AddScoped<ITokenService, JovieJoy.Api.Services.TokenService>();
builder.Services.AddScoped<IGoogleAuthService, GoogleAuthService>();
builder.Services.AddScoped<IStripeService, StripeService>();
builder.Services.AddScoped<IOrderService, OrderService>();

builder.Services.AddHttpClient();

// Stripe SDK static config
StripeConfiguration.ApiKey = builder.Configuration["Stripe:SecretKey"]
    ?? throw new InvalidOperationException("Stripe__SecretKey is required");

// ----- CORS -----
// The web app runs on a different origin in dev (3000) and prod (3080).
// WebAppUrl is the allowed origin.
var webAppUrl = builder.Configuration["WebAppUrl"] ?? "http://localhost:3000";
builder.Services.AddCors(opts =>
{
    opts.AddDefaultPolicy(policy =>
        policy.WithOrigins(webAppUrl)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ----- Migrations on startup -----
// For a small app this is fine. At scale, split into a separate migration
// job so multiple replicas don't race.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await DbSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Lightweight health probe
app.MapGet("/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

app.Run();
