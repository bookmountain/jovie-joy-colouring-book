using System.IdentityModel.Tokens.Jwt;
using System.Text;
using DotNetEnv;
using JovieJoy.Api.Data;
using JovieJoy.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Stripe;

if (System.IO.File.Exists(".env.local"))
    Env.Load(".env.local");
else
    Env.TraversePath().Load();

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

// ----- App services -----
builder.Services.AddScoped<ITokenService, JovieJoy.Api.Services.TokenService>();
builder.Services.AddScoped<IGoogleAuthService, GoogleAuthService>();
builder.Services.AddScoped<IStripeService, StripeService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddHttpClient();

StripeConfiguration.ApiKey = builder.Configuration["Stripe:SecretKey"]
    ?? throw new InvalidOperationException("Stripe__SecretKey is required");

// ----- CORS -----
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

// ----- Migrations + seed on startup -----
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var cfg = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    db.Database.Migrate();
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
});

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

app.Run();
