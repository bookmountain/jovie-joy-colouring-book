# Freebie Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing "freebies = zero-price products" hack with a first-class `Freebie` entity, email-gated tokenised downloads via Resend (dev-noop when API key blank), and a dedicated `/admin/freebies` workspace.

**Architecture:** New `Freebie` + `FreebieRequest` EF entities and EF migration with backfill from `ProductType.Freebie`. Public API issues random tokens and sends a download link via `IEmailSender` (Resend HTTP client; falls back to logging when key missing). `GET /api/freebies/download/{token}` streams the file. Storefront `<FreebieGrid>` renders cards that open an `<EmailGateModal>` instead of navigating to `/products/{slug}`. Admin gets list, edit-form, cover/file uploads, and a per-freebie requests panel.

**Tech Stack:** .NET 9 (`apps/api`, xUnit + FluentAssertions tests via `ApiFactory`), Next.js 15 App Router (`apps/web`, vitest + React Testing Library), EF Core + PostgreSQL (jsonb), `IUploadService` for cover image, raw filesystem for the PDF/ZIP file (mirrors existing PdfPath flow), `IMemoryCache` rate limiting (mirrors `NewsletterController`).

**Spec:** [`docs/superpowers/specs/2026-05-22-freebie-redesign-design.md`](../specs/2026-05-22-freebie-redesign-design.md)

---

## File map (created or modified)

**API (`apps/api`):**
- Create: `Data/Entities/Freebie.cs`, `Data/Entities/FreebieRequest.cs`
- Create: `Contracts/FreebieDtos.cs`
- Create: `Controllers/FreebiesController.cs`, `Controllers/Admin/AdminFreebiesController.cs`
- Create: `Services/IEmailSender.cs`, `Services/ResendEmailSender.cs`
- Create: `Services/FreebieTokens.cs`
- Create: `Data/Seed/SeedFreebies.cs`
- Create: `Migrations/<timestamp>_AddFreebies.cs` (EF-generated, then edited with backfill SQL)
- Modify: `Data/AppDbContext.cs` (add DbSets + model config)
- Modify: `Program.cs` (DI + `appsettings` binding)
- Modify: `appsettings.json`, `.env`, `.env.example`
- Modify: `Data/Seed/SeedProducts.cs` (drop mini-coloring-book), `Data/Seed/SeedCollections.cs` (drop freebies collection), `Data/Seed/SeedPages.cs` (rewrite freebies page blocks), `Data/Seed/DbSeeder.cs` *(or whichever file calls the seeders — check `Program.cs`)*

**API tests (`apps/api.Tests`):**
- Create: `FreebiesControllerTests.cs`, `AdminFreebiesControllerTests.cs`, `FreebieDownloadTests.cs`, `FreebieTokenTests.cs`
- Modify: `ApiFactory.cs` (add `SeedFreebie` helper + `CreateAnonClient` already exists as `CreateClient`)

**Web (`apps/web`):**
- Create: `src/lib/freebies.ts` (typed fetchers for public + admin)
- Create: `src/components/storefront/FreebieGrid.tsx`, `src/components/storefront/FreebieCard.tsx`, `src/components/storefront/EmailGateModal.tsx`
- Create: `src/app/admin/freebies/[slug]/page.tsx`
- Create: `src/components/admin/freebie/FreebieForm.tsx`, `src/components/admin/freebie/FreebieRequestsPanel.tsx`
- Modify: `src/app/(public)/pages/[slug]/page.tsx` (use `<FreebieGrid>`)
- Modify: `src/app/admin/freebies/page.tsx` (replace placeholder with list)
- Modify: `src/components/admin/product/AdminFormatPicker.tsx`, `src/app/admin/products/page.tsx` (drop "freebie" format)
- Modify: `tests/unit/admin-format-picker.test.tsx` (drop "freebie" case)

**Web tests (`apps/web/tests`):**
- Create: `tests/unit/freebie-card.test.tsx`, `tests/unit/email-gate-modal.test.tsx`

---

## Task 1: `Freebie` + `FreebieRequest` entities + DbContext wiring

**Files:**
- Create: `apps/api/Data/Entities/Freebie.cs`
- Create: `apps/api/Data/Entities/FreebieRequest.cs`
- Modify: `apps/api/Data/AppDbContext.cs`

- [ ] **Step 1: Create `Freebie` entity**

Write `apps/api/Data/Entities/Freebie.cs`:

```csharp
namespace JovieJoy.Api.Data.Entities;

public class Freebie
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Excerpt { get; set; } = null!;
    public List<string> Description { get; set; } = new();
    public string CoverImage { get; set; } = "";
    public string FilePath { get; set; } = "";
    public string FileKind { get; set; } = "pdf";
    public long FileSizeBytes { get; set; }
    public int SortIndex { get; set; }
    public bool Published { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<FreebieRequest> Requests { get; set; } = new List<FreebieRequest>();
}
```

- [ ] **Step 2: Create `FreebieRequest` entity**

Write `apps/api/Data/Entities/FreebieRequest.cs`:

```csharp
namespace JovieJoy.Api.Data.Entities;

public class FreebieRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FreebieId { get; set; }
    public Freebie Freebie { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Token { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public bool OptedIntoNewsletter { get; set; }
    public int DownloadCount { get; set; }
    public DateTime? FirstDownloadedAt { get; set; }
    public DateTime? LastDownloadedAt { get; set; }
    public string? Ip { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

- [ ] **Step 3: Register DbSets in `AppDbContext`**

In `apps/api/Data/AppDbContext.cs`, add two `DbSet` properties next to the existing ones (alphabetical-ish, near `Faqs`):

```csharp
public DbSet<Freebie> Freebies => Set<Freebie>();
public DbSet<FreebieRequest> FreebieRequests => Set<FreebieRequest>();
```

- [ ] **Step 4: Configure entities in `OnModelCreating`**

Inside the existing `OnModelCreating(ModelBuilder b)` method (after the existing entities), append:

```csharp
b.Entity<Freebie>(e =>
{
    e.ToTable("freebies");
    e.HasKey(x => x.Id);
    e.Property(x => x.Slug).HasMaxLength(200).IsRequired();
    e.HasIndex(x => x.Slug).IsUnique();
    e.Property(x => x.Title).HasMaxLength(300).IsRequired();
    e.Property(x => x.Excerpt).HasMaxLength(1000).IsRequired();
    e.Property(x => x.Description).HasColumnType("jsonb").HasConversion(jsonStringList);
    e.Property(x => x.CoverImage).HasMaxLength(500);
    e.Property(x => x.FilePath).HasMaxLength(500);
    e.Property(x => x.FileKind).HasMaxLength(8);
});

b.Entity<FreebieRequest>(e =>
{
    e.ToTable("freebie_requests");
    e.HasKey(x => x.Id);
    e.HasOne(x => x.Freebie).WithMany(f => f.Requests).HasForeignKey(x => x.FreebieId).OnDelete(DeleteBehavior.Cascade);
    e.Property(x => x.Email).HasMaxLength(320).IsRequired();
    e.Property(x => x.Token).HasMaxLength(64).IsRequired();
    e.HasIndex(x => x.Token).IsUnique();
    e.HasIndex(x => x.Email);
    e.HasIndex(x => x.FreebieId);
    e.Property(x => x.Ip).HasMaxLength(64);
    e.Property(x => x.UserAgent).HasMaxLength(500);
});
```

- [ ] **Step 5: Build to verify**

Run: `cd apps/api && dotnet build`
Expected: `Build succeeded` with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/Data/Entities/Freebie.cs apps/api/Data/Entities/FreebieRequest.cs apps/api/Data/AppDbContext.cs
git commit -m "feat(api): Freebie + FreebieRequest entities with DbContext wiring"
```

---

## Task 2: EF migration `AddFreebies` (schema + backfill)

**Files:**
- Create: `apps/api/Migrations/<timestamp>_AddFreebies.cs` (generated, then hand-edit `Up()`)

- [ ] **Step 1: Generate the migration**

Run from `apps/api`:

```bash
dotnet ef migrations add AddFreebies --output-dir Migrations
```

Expected: a new file `Migrations/<timestamp>_AddFreebies.cs` (plus designer + snapshot updates). The auto-generated `Up()` will contain `CreateTable("freebies", ...)` and `CreateTable("freebie_requests", ...)`.

- [ ] **Step 2: Add backfill SQL at the end of `Up()`**

Open the new `<timestamp>_AddFreebies.cs`. After the two `CreateTable` calls (and after any `CreateIndex` lines for the new tables), append at the bottom of `Up(MigrationBuilder migrationBuilder)`:

```csharp
migrationBuilder.Sql(@"
INSERT INTO freebies (
    ""Id"", ""Slug"", ""Title"", ""Excerpt"", ""Description"", ""CoverImage"",
    ""FilePath"", ""FileKind"", ""FileSizeBytes"", ""SortIndex"", ""Published"",
    ""CreatedAt"", ""UpdatedAt"")
SELECT
    ""Id"", ""Slug"", ""Title"", ""Excerpt"", ""Description"",
    COALESCE(""Images""->>0, ''),
    COALESCE(""PdfPath"", ''),
    'pdf', 0, 0, true,
    ""CreatedAt"", ""UpdatedAt""
FROM products
WHERE ""ProductType"" = 3;
");

migrationBuilder.Sql(@"
DELETE FROM ""ProductCollections""
 WHERE ""ProductId"" IN (SELECT ""Id"" FROM products WHERE ""ProductType"" = 3);
DELETE FROM products WHERE ""ProductType"" = 3;
DELETE FROM collections WHERE ""Slug"" = 'freebies';
");
```

If the existing tables use snake_case columns instead of quoted PascalCase (inspect a prior migration to confirm), align the casing. Do NOT change the auto-generated `CreateTable` blocks.

- [ ] **Step 3: Add the no-op `Down()` reverse note**

In the same file, find `Down(MigrationBuilder migrationBuilder)`. The generator already emits `DropTable(...)` calls. The data backfill cannot be reversed cleanly, so leave `Down()` as the generator wrote it — we accept that rolling back drops the freebies. No extra code in `Down()`.

- [ ] **Step 4: Build**

Run: `cd apps/api && dotnet build`
Expected: Build succeeded.

- [ ] **Step 5: Apply to local dev DB**

Run from `apps/api`:

```bash
dotnet ef database update
```

Expected: `Done.` with no errors. If you have an existing `mini-coloring-book` row, it should now appear in `freebies`.

Verify with: `psql -h localhost -p 5433 -U postgres -d jovie_joy -c 'SELECT "Slug", "FilePath" FROM freebies;'`
Expected: one row, slug `mini-coloring-book`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/Migrations/
git commit -m "feat(api): migration AddFreebies with ProductType.Freebie backfill"
```

---

## Task 3: Token generator + tests

**Files:**
- Create: `apps/api/Services/FreebieTokens.cs`
- Create: `apps/api.Tests/FreebieTokenTests.cs`

- [ ] **Step 1: Write the failing test**

Create `apps/api.Tests/FreebieTokenTests.cs`:

```csharp
using FluentAssertions;
using JovieJoy.Api.Services;

namespace JovieJoy.Api.Tests;

public class FreebieTokenTests
{
    [Fact]
    public void Generate_returns_url_safe_string_of_expected_length()
    {
        var token = FreebieTokens.Generate();
        token.Should().NotBeNullOrWhiteSpace();
        token.Length.Should().BeGreaterThanOrEqualTo(40);
        token.Should().MatchRegex("^[A-Za-z0-9_-]+$");
    }

    [Fact]
    public void Generate_returns_unique_tokens()
    {
        var tokens = Enumerable.Range(0, 100).Select(_ => FreebieTokens.Generate()).ToHashSet();
        tokens.Count.Should().Be(100);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api.Tests && dotnet test --filter FreebieTokenTests`
Expected: build error — `FreebieTokens` not found.

- [ ] **Step 3: Implement `FreebieTokens`**

Create `apps/api/Services/FreebieTokens.cs`:

```csharp
using System.Security.Cryptography;

namespace JovieJoy.Api.Services;

public static class FreebieTokens
{
    public static string Generate()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/api.Tests && dotnet test --filter FreebieTokenTests`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Services/FreebieTokens.cs apps/api.Tests/FreebieTokenTests.cs
git commit -m "feat(api): FreebieTokens.Generate with crypto-random base64url"
```

---

## Task 4: `IEmailSender` + Resend client (dev-noop when key blank)

**Files:**
- Create: `apps/api/Services/IEmailSender.cs`
- Create: `apps/api/Services/ResendEmailSender.cs`
- Modify: `apps/api/Program.cs`
- Modify: `apps/api/appsettings.json`, `apps/api/.env`, `apps/api/.env.example`

- [ ] **Step 1: Define the interface**

Create `apps/api/Services/IEmailSender.cs`:

```csharp
using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Services;

public interface IEmailSender
{
    Task SendFreebieDownloadAsync(string to, Freebie freebie, string downloadUrl, CancellationToken ct);
}
```

- [ ] **Step 2: Implement Resend client with dev-noop fallback**

Create `apps/api/Services/ResendEmailSender.cs`:

```csharp
using System.Net.Http.Headers;
using System.Net.Http.Json;
using JovieJoy.Api.Data.Entities;
using Microsoft.Extensions.Options;

namespace JovieJoy.Api.Services;

public class ResendOptions
{
    public string? ApiKey { get; set; }
    public string FromAddress { get; set; } = "hello@jovie-joy.local";
    public string FromName { get; set; } = "Jovie Joy";
}

public class ResendEmailSender(HttpClient http, IOptions<ResendOptions> opts, ILogger<ResendEmailSender> log) : IEmailSender
{
    public async Task SendFreebieDownloadAsync(string to, Freebie f, string downloadUrl, CancellationToken ct)
    {
        var subject = $"Your free download — {f.Title}";
        var html = BuildHtml(f, downloadUrl);
        var text = $"Your download link for {f.Title}: {downloadUrl}\nThis link expires in 7 days.";

        if (string.IsNullOrWhiteSpace(opts.Value.ApiKey))
        {
            log.LogInformation("[dev-noop email] to={To} subject={Subject} url={Url}", to, subject, downloadUrl);
            return;
        }

        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", opts.Value.ApiKey);
        var payload = new
        {
            from = $"{opts.Value.FromName} <{opts.Value.FromAddress}>",
            to = new[] { to },
            subject,
            html,
            text,
        };
        var resp = await http.PostAsJsonAsync("https://api.resend.com/emails", payload, ct);
        if (!resp.IsSuccessStatusCode)
        {
            var body = await resp.Content.ReadAsStringAsync(ct);
            log.LogError("Resend send failed: {Status} {Body}", resp.StatusCode, body);
            throw new InvalidOperationException($"Resend send failed: {resp.StatusCode}");
        }
    }

    private static string BuildHtml(Freebie f, string url) => $@"
<!doctype html><html><body style=""font-family:system-ui,sans-serif;color:#222"">
  <h2 style=""margin:0 0 12px 0"">{System.Net.WebUtility.HtmlEncode(f.Title)}</h2>
  <p>Thanks for grabbing this freebie! Click the button below to download.</p>
  <p><a href=""{url}"" style=""display:inline-block;background:#5b3aa8;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none"">Download your file</a></p>
  <p style=""font-size:13px;color:#666"">This link expires in 7 days. If the button doesn't work, copy and paste: <br/>{url}</p>
</body></html>";
}
```

- [ ] **Step 3: Bind options + DI in `Program.cs`**

In `apps/api/Program.cs`, after other `builder.Services.Add*` lines (look for `AddHttpClient` patterns, or just after `builder.Services.AddDbContext`), add:

```csharp
builder.Services.Configure<ResendOptions>(builder.Configuration.GetSection("Resend"));
builder.Services.AddHttpClient<IEmailSender, ResendEmailSender>();
```

You'll also need `using JovieJoy.Api.Services;` at the top if not present.

- [ ] **Step 4: Add configuration placeholders**

Append to `apps/api/.env`:

```
Resend__ApiKey=
Resend__FromAddress=hello@jovie-joy.local
Resend__FromName=Jovie Joy
Freebies__DownloadTtlDays=7
Freebies__MaxFileSizeMb=15
Freebies__BaseUrl=http://localhost:8080
```

Append the same keys to `apps/api/.env.example` (committed; values can stay blank/placeholder).

In `apps/api/appsettings.json`, add a top-level `"Resend"` and `"Freebies"` section:

```json
"Resend": {
  "ApiKey": "",
  "FromAddress": "hello@jovie-joy.local",
  "FromName": "Jovie Joy"
},
"Freebies": {
  "DownloadTtlDays": 7,
  "MaxFileSizeMb": 15,
  "BaseUrl": "http://localhost:8080"
}
```

- [ ] **Step 5: Build**

Run: `cd apps/api && dotnet build`
Expected: Build succeeded.

- [ ] **Step 6: Commit**

```bash
git add apps/api/Services/IEmailSender.cs apps/api/Services/ResendEmailSender.cs apps/api/Program.cs apps/api/appsettings.json apps/api/.env apps/api/.env.example
git commit -m "feat(api): IEmailSender + ResendEmailSender with dev-noop fallback"
```

---

## Task 5: Freebie DTOs + public `FreebiesController` (list + get)

**Files:**
- Create: `apps/api/Contracts/FreebieDtos.cs`
- Create: `apps/api/Controllers/FreebiesController.cs`
- Modify: `apps/api.Tests/ApiFactory.cs` (seed helper)
- Create: `apps/api.Tests/FreebiesControllerTests.cs`

- [ ] **Step 1: Add seed helper to `ApiFactory`**

In `apps/api.Tests/ApiFactory.cs`, add a new helper at the bottom of the class:

```csharp
public async Task<Guid> SeedFreebie(string slug = "demo-freebie", bool published = true, string filePath = "/uploads/freebies/files/demo.pdf")
{
    using var scope = Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var f = new Freebie
    {
        Slug = slug,
        Title = $"Title {slug}",
        Excerpt = "Free thing",
        Description = new List<string> { "Paragraph one." },
        CoverImage = "/uploads/freebies/covers/demo.png",
        FilePath = filePath,
        FileKind = "pdf",
        FileSizeBytes = 1024,
        SortIndex = 0,
        Published = published,
    };
    db.Freebies.Add(f);
    await db.SaveChangesAsync();
    return f.Id;
}
```

- [ ] **Step 2: Write failing tests**

Create `apps/api.Tests/FreebiesControllerTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using JovieJoy.Api.Contracts;

namespace JovieJoy.Api.Tests;

public class FreebiesControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public FreebiesControllerTests(ApiFactory f) => _factory = f;

    [Fact]
    public async Task List_returns_only_published()
    {
        await _factory.SeedFreebie("pub-1", published: true);
        await _factory.SeedFreebie("draft-1", published: false);

        var client = _factory.CreateClient();
        var items = await client.GetFromJsonAsync<List<FreebieListItemDto>>("/api/freebies");

        items.Should().NotBeNull();
        items!.Should().Contain(x => x.Slug == "pub-1");
        items.Should().NotContain(x => x.Slug == "draft-1");
    }

    [Fact]
    public async Task Get_by_slug_returns_published_freebie()
    {
        await _factory.SeedFreebie("getme", published: true);
        var client = _factory.CreateClient();
        var dto = await client.GetFromJsonAsync<FreebieDto>("/api/freebies/getme");
        dto.Should().NotBeNull();
        dto!.Slug.Should().Be("getme");
    }

    [Fact]
    public async Task Get_by_slug_returns_404_when_unpublished()
    {
        await _factory.SeedFreebie("hidden", published: false);
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/freebies/hidden");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/api.Tests && dotnet test --filter FreebiesControllerTests`
Expected: build error — `FreebieListItemDto`, `FreebieDto`, `/api/freebies` not found.

- [ ] **Step 4: Create DTOs**

Create `apps/api/Contracts/FreebieDtos.cs`:

```csharp
using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Contracts;

public record FreebieListItemDto(
    string Slug, string Title, string Excerpt, string CoverImage,
    string FileKind, long FileSizeBytes, int SortIndex)
{
    public static FreebieListItemDto From(Freebie f) =>
        new(f.Slug, f.Title, f.Excerpt, f.CoverImage, f.FileKind, f.FileSizeBytes, f.SortIndex);
}

public record FreebieDto(
    string Slug, string Title, string Excerpt, List<string> Description,
    string CoverImage, string FileKind, long FileSizeBytes)
{
    public static FreebieDto From(Freebie f) =>
        new(f.Slug, f.Title, f.Excerpt, f.Description, f.CoverImage, f.FileKind, f.FileSizeBytes);
}

public record FreebieAdminDto(
    Guid Id, string Slug, string Title, string Excerpt, List<string> Description,
    string CoverImage, string FilePath, string FileKind, long FileSizeBytes,
    int SortIndex, bool Published, int RequestCount, DateTime? LastRequestedAt,
    DateTime CreatedAt, DateTime UpdatedAt)
{
    public static FreebieAdminDto From(Freebie f, int requestCount, DateTime? lastRequestedAt) =>
        new(f.Id, f.Slug, f.Title, f.Excerpt, f.Description, f.CoverImage,
            f.FilePath, f.FileKind, f.FileSizeBytes, f.SortIndex, f.Published,
            requestCount, lastRequestedAt, f.CreatedAt, f.UpdatedAt);
}

public record FreebieRequestDto(
    Guid Id, string Email, bool OptedIntoNewsletter, int DownloadCount,
    DateTime? FirstDownloadedAt, DateTime? LastDownloadedAt,
    DateTime ExpiresAt, DateTime CreatedAt);

public record CreateFreebieRequest(string Slug, string Title, string Excerpt, List<string>? Description, bool? Published);
public record UpdateFreebieRequest(string Title, string Excerpt, List<string> Description, bool Published);
public record FreebieRequestCreate(string Email, bool OptIn);
public record FreebieReorderItem(string Slug, int SortIndex);
```

- [ ] **Step 5: Create the public controller**

Create `apps/api/Controllers/FreebiesController.cs`:

```csharp
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers;

[ApiController]
[Route("api/freebies")]
public class FreebiesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FreebieListItemDto>>> List(CancellationToken ct)
    {
        var rows = await db.Freebies.AsNoTracking()
            .Where(f => f.Published)
            .OrderBy(f => f.SortIndex).ThenBy(f => f.Title)
            .ToListAsync(ct);
        return Ok(rows.Select(FreebieListItemDto.From));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<FreebieDto>> Get(string slug, CancellationToken ct)
    {
        var f = await db.Freebies.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Slug == slug && x.Published, ct);
        if (f is null) return NotFound();
        return Ok(FreebieDto.From(f));
    }
}
```

- [ ] **Step 6: Run tests**

Run: `cd apps/api.Tests && dotnet test --filter FreebiesControllerTests`
Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/Contracts/FreebieDtos.cs apps/api/Controllers/FreebiesController.cs apps/api.Tests/ApiFactory.cs apps/api.Tests/FreebiesControllerTests.cs
git commit -m "feat(api): FreebiesController (GET list + get-by-slug) + DTOs"
```

---

## Task 6: `POST /api/freebies/{slug}/request` (dedupe + opt-in + email)

**Files:**
- Modify: `apps/api/Controllers/FreebiesController.cs`
- Modify: `apps/api.Tests/FreebiesControllerTests.cs`
- Create: `apps/api.Tests/FakeEmailSender.cs`

- [ ] **Step 1: Add a fake email sender for tests**

Create `apps/api.Tests/FakeEmailSender.cs`:

```csharp
using System.Collections.Concurrent;
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;

namespace JovieJoy.Api.Tests;

public class FakeEmailSender : IEmailSender
{
    public ConcurrentBag<(string To, string Slug, string Url)> Sent { get; } = new();

    public Task SendFreebieDownloadAsync(string to, Freebie f, string url, CancellationToken ct)
    {
        Sent.Add((to, f.Slug, url));
        return Task.CompletedTask;
    }
}
```

- [ ] **Step 2: Register `FakeEmailSender` in `ApiFactory`**

In `apps/api.Tests/ApiFactory.cs`, inside `ConfigureWebHost` after the `AddDbContext` line:

```csharp
services.RemoveAll<IEmailSender>();
services.AddSingleton<FakeEmailSender>();
services.AddSingleton<IEmailSender>(sp => sp.GetRequiredService<FakeEmailSender>());
```

Add the `using JovieJoy.Api.Services;` import at the top if not already present.

Expose the sender from the factory:

```csharp
public FakeEmailSender Emails => Services.GetRequiredService<FakeEmailSender>();
```

- [ ] **Step 3: Write failing tests**

In `apps/api.Tests/FreebiesControllerTests.cs`, append:

```csharp
[Fact]
public async Task Request_creates_row_and_sends_email()
{
    await _factory.SeedFreebie("req-1");
    var client = _factory.CreateClient();
    var resp = await client.PostAsJsonAsync("/api/freebies/req-1/request",
        new { email = "a@b.com", optIn = true });
    resp.IsSuccessStatusCode.Should().BeTrue();
    _factory.Emails.Sent.Should().ContainSingle(x => x.To == "a@b.com" && x.Slug == "req-1");
}

[Fact]
public async Task Request_with_optIn_upserts_newsletter_subscriber()
{
    await _factory.SeedFreebie("req-2");
    var client = _factory.CreateClient();
    await client.PostAsJsonAsync("/api/freebies/req-2/request",
        new { email = "n@b.com", optIn = true });
    using var scope = _factory.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    (await db.NewsletterSubscribers.AnyAsync(s => s.Email == "n@b.com")).Should().BeTrue();
}

[Fact]
public async Task Request_without_optIn_does_not_subscribe()
{
    await _factory.SeedFreebie("req-3");
    var client = _factory.CreateClient();
    await client.PostAsJsonAsync("/api/freebies/req-3/request",
        new { email = "noopt@b.com", optIn = false });
    using var scope = _factory.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    (await db.NewsletterSubscribers.AnyAsync(s => s.Email == "noopt@b.com")).Should().BeFalse();
}

[Fact]
public async Task Request_dedupes_second_submission_for_same_email()
{
    await _factory.SeedFreebie("req-4");
    var client = _factory.CreateClient();
    await client.PostAsJsonAsync("/api/freebies/req-4/request",
        new { email = "dup@b.com", optIn = true });
    await client.PostAsJsonAsync("/api/freebies/req-4/request",
        new { email = "dup@b.com", optIn = true });

    using var scope = _factory.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var rows = await db.FreebieRequests.Where(r => r.Email == "dup@b.com").ToListAsync();
    rows.Should().HaveCount(1);
    _factory.Emails.Sent.Count(x => x.To == "dup@b.com").Should().Be(2);
}

[Fact]
public async Task Request_returns_400_for_invalid_email()
{
    await _factory.SeedFreebie("req-5");
    var client = _factory.CreateClient();
    var resp = await client.PostAsJsonAsync("/api/freebies/req-5/request",
        new { email = "not-an-email", optIn = false });
    resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
}

[Fact]
public async Task Request_returns_404_for_unpublished_freebie()
{
    await _factory.SeedFreebie("req-6", published: false);
    var client = _factory.CreateClient();
    var resp = await client.PostAsJsonAsync("/api/freebies/req-6/request",
        new { email = "a@b.com", optIn = false });
    resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
}
```

Add at the top of the file: `using JovieJoy.Api.Data; using JovieJoy.Api.Data.Entities; using Microsoft.EntityFrameworkCore; using Microsoft.Extensions.DependencyInjection; using System.Net.Http.Json;` if missing.

- [ ] **Step 4: Run tests — they must fail**

Run: `cd apps/api.Tests && dotnet test --filter FreebiesControllerTests`
Expected: build OK; tests fail (no POST endpoint yet) with 404s or NotImplemented-style errors.

- [ ] **Step 5: Implement the POST endpoint**

In `apps/api/Controllers/FreebiesController.cs`, change the controller signature and add the endpoint:

```csharp
using JovieJoy.Api.Data.Entities;
using JovieJoy.Api.Services;
using Microsoft.Extensions.Options;

[ApiController]
[Route("api/freebies")]
public class FreebiesController(
    AppDbContext db,
    IEmailSender email,
    IOptions<FreebiesOptions> opts) : ControllerBase
{
    // ... existing List and Get

    [HttpPost("{slug}/request")]
    public async Task<IActionResult> Request(string slug, [FromBody] FreebieRequestCreate body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Email) || !body.Email.Contains('@') || body.Email.Length > 320)
            return BadRequest(new { error = "Valid email required" });

        var f = await db.Freebies.FirstOrDefaultAsync(x => x.Slug == slug && x.Published, ct);
        if (f is null) return NotFound();

        var ttl = TimeSpan.FromDays(opts.Value.DownloadTtlDays);
        var existing = await db.FreebieRequests
            .FirstOrDefaultAsync(r => r.FreebieId == f.Id && r.Email == body.Email, ct);
        FreebieRequest row;
        if (existing is not null)
        {
            existing.Token = FreebieTokens.Generate();
            existing.ExpiresAt = DateTime.UtcNow + ttl;
            existing.OptedIntoNewsletter = existing.OptedIntoNewsletter || body.OptIn;
            row = existing;
        }
        else
        {
            row = new FreebieRequest
            {
                FreebieId = f.Id,
                Email = body.Email,
                Token = FreebieTokens.Generate(),
                ExpiresAt = DateTime.UtcNow + ttl,
                OptedIntoNewsletter = body.OptIn,
                Ip = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
            };
            db.FreebieRequests.Add(row);
        }

        if (body.OptIn && !await db.NewsletterSubscribers.AnyAsync(s => s.Email == body.Email, ct))
            db.NewsletterSubscribers.Add(new NewsletterSubscriber { Email = body.Email });

        await db.SaveChangesAsync(ct);

        var url = $"{opts.Value.BaseUrl.TrimEnd('/')}/api/freebies/download/{row.Token}";
        await email.SendFreebieDownloadAsync(body.Email, f, url, ct);

        return Ok(new { ok = true });
    }
}
```

Also add the options class — append to `apps/api/Services/ResendEmailSender.cs` (or its own file) next to `ResendOptions`:

```csharp
public class FreebiesOptions
{
    public int DownloadTtlDays { get; set; } = 7;
    public int MaxFileSizeMb { get; set; } = 15;
    public string BaseUrl { get; set; } = "http://localhost:8080";
}
```

Register in `Program.cs`, next to the `Resend` binding:

```csharp
builder.Services.Configure<FreebiesOptions>(builder.Configuration.GetSection("Freebies"));
```

- [ ] **Step 6: Run tests — they must pass**

Run: `cd apps/api.Tests && dotnet test --filter FreebiesControllerTests`
Expected: all 9 tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/Controllers/FreebiesController.cs apps/api/Services/ResendEmailSender.cs apps/api/Program.cs apps/api.Tests/
git commit -m "feat(api): POST /api/freebies/{slug}/request with dedupe + opt-in"
```

---

## Task 7: `GET /api/freebies/download/{token}` — stream + tracking

**Files:**
- Modify: `apps/api/Controllers/FreebiesController.cs`
- Create: `apps/api.Tests/FreebieDownloadTests.cs`

- [ ] **Step 1: Write failing tests**

Create `apps/api.Tests/FreebieDownloadTests.cs`:

```csharp
using System.Net;
using FluentAssertions;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class FreebieDownloadTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public FreebieDownloadTests(ApiFactory f) => _factory = f;

    private async Task<(string token, string filePath)> SeedRequest(
        string slug, DateTime expiresAt, bool published = true)
    {
        // Write a temp file so the controller has something to stream.
        var contentRoot = AppContext.BaseDirectory;
        var dir = Path.Combine(contentRoot, "uploads", "freebies", "files");
        Directory.CreateDirectory(dir);
        var fileName = $"{Guid.NewGuid():N}.pdf";
        var abs = Path.Combine(dir, fileName);
        await File.WriteAllBytesAsync(abs, new byte[] { 1, 2, 3, 4 });
        var rel = $"/uploads/freebies/files/{fileName}";

        var freebieId = await _factory.SeedFreebie(slug, published: published, filePath: rel);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var token = $"tok-{Guid.NewGuid():N}";
        db.FreebieRequests.Add(new FreebieRequest
        {
            FreebieId = freebieId, Email = "x@y.com", Token = token,
            ExpiresAt = expiresAt, OptedIntoNewsletter = false,
        });
        await db.SaveChangesAsync();
        return (token, abs);
    }

    [Fact]
    public async Task Valid_token_streams_file_and_increments_count()
    {
        var (token, _) = await SeedRequest("dl-1", DateTime.UtcNow.AddDays(1));
        var client = _factory.CreateClient();
        var resp = await client.GetAsync($"/api/freebies/download/{token}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        resp.Content.Headers.ContentDisposition!.DispositionType.Should().Be("attachment");
        (await resp.Content.ReadAsByteArrayAsync()).Should().HaveCount(4);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await db.FreebieRequests.FirstAsync(r => r.Token == token);
        row.DownloadCount.Should().Be(1);
        row.FirstDownloadedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Expired_token_redirects_to_expired_banner()
    {
        var (token, _) = await SeedRequest("dl-2", DateTime.UtcNow.AddDays(-1));
        var client = _factory.CreateClient(new() { AllowAutoRedirect = false });
        var resp = await client.GetAsync($"/api/freebies/download/{token}");
        resp.StatusCode.Should().BeOneOf(HttpStatusCode.Redirect, HttpStatusCode.Found, HttpStatusCode.SeeOther);
        resp.Headers.Location!.ToString().Should().Contain("download=expired");
    }

    [Fact]
    public async Task Unknown_token_redirects_to_invalid_banner()
    {
        var client = _factory.CreateClient(new() { AllowAutoRedirect = false });
        var resp = await client.GetAsync("/api/freebies/download/does-not-exist");
        resp.Headers.Location!.ToString().Should().Contain("download=invalid");
    }

    [Fact]
    public async Task Unpublished_freebie_treats_as_expired()
    {
        var (token, _) = await SeedRequest("dl-3", DateTime.UtcNow.AddDays(1), published: false);
        var client = _factory.CreateClient(new() { AllowAutoRedirect = false });
        var resp = await client.GetAsync($"/api/freebies/download/{token}");
        resp.Headers.Location!.ToString().Should().Contain("download=expired");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api.Tests && dotnet test --filter FreebieDownloadTests`
Expected: failures — endpoint not implemented.

- [ ] **Step 3: Implement download endpoint**

In `apps/api/Controllers/FreebiesController.cs`, add `IWebHostEnvironment env` to the constructor and add the endpoint:

```csharp
public class FreebiesController(
    AppDbContext db,
    IEmailSender email,
    IOptions<FreebiesOptions> opts,
    IWebHostEnvironment env) : ControllerBase
{
    // ... existing endpoints

    [HttpGet("download/{token}")]
    public async Task<IActionResult> Download(string token, CancellationToken ct)
    {
        var webAppUrl = HttpContext.RequestServices
            .GetRequiredService<IConfiguration>()["WebAppUrl"] ?? "http://localhost:3000";

        var req = await db.FreebieRequests.Include(r => r.Freebie)
            .FirstOrDefaultAsync(r => r.Token == token, ct);
        if (req is null) return Redirect($"{webAppUrl}/pages/freebies?download=invalid");
        if (req.ExpiresAt < DateTime.UtcNow || !req.Freebie.Published)
            return Redirect($"{webAppUrl}/pages/freebies?download=expired");

        var rel = req.Freebie.FilePath.TrimStart('/');
        var abs = Path.Combine(env.ContentRootPath, rel.Replace('/', Path.DirectorySeparatorChar));
        if (!System.IO.File.Exists(abs))
            return Redirect($"{webAppUrl}/pages/freebies?download=expired");

        req.DownloadCount += 1;
        req.FirstDownloadedAt ??= DateTime.UtcNow;
        req.LastDownloadedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var safeSlug = string.Concat(req.Freebie.Slug.Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_'));
        var downloadName = $"{safeSlug}.{req.Freebie.FileKind}";
        var contentType = req.Freebie.FileKind == "zip" ? "application/zip" : "application/pdf";
        var stream = System.IO.File.OpenRead(abs);
        return File(stream, contentType, downloadName);
    }
}
```

- [ ] **Step 4: Fix test file path resolution**

The test writes files to `AppContext.BaseDirectory` but the controller reads from `env.ContentRootPath`. Under WebApplicationFactory, those are different. Update `SeedRequest` in `FreebieDownloadTests.cs` to write into the host's content root:

```csharp
using var scope = _factory.Services.CreateScope();
var hostEnv = scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>();
var dir = Path.Combine(hostEnv.ContentRootPath, "uploads", "freebies", "files");
```

Replace the earlier `contentRoot = AppContext.BaseDirectory` block with the scope-based lookup; keep the rest of the helper.

- [ ] **Step 5: Run tests — they must pass**

Run: `cd apps/api.Tests && dotnet test --filter FreebieDownloadTests`
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/Controllers/FreebiesController.cs apps/api.Tests/FreebieDownloadTests.cs
git commit -m "feat(api): GET /api/freebies/download/{token} streams file + tracks downloads"
```

---

## Task 8: Admin freebies controller — list/create/update/delete + reorder

**Files:**
- Create: `apps/api/Controllers/Admin/AdminFreebiesController.cs`
- Create: `apps/api.Tests/AdminFreebiesControllerTests.cs`

- [ ] **Step 1: Write failing tests**

Create `apps/api.Tests/AdminFreebiesControllerTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class AdminFreebiesControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public AdminFreebiesControllerTests(ApiFactory f) => _factory = f;

    [Fact]
    public async Task List_requires_admin()
    {
        var anon = _factory.CreateClient();
        var resp = await anon.GetAsync("/api/admin/freebies");
        resp.StatusCode.Should().BeOneOf(HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task List_returns_published_and_drafts()
    {
        await _factory.SeedFreebie("adm-pub", published: true);
        await _factory.SeedFreebie("adm-draft", published: false);
        var admin = await _factory.CreateAdminClientAsync();
        var items = await admin.GetFromJsonAsync<List<FreebieAdminDto>>("/api/admin/freebies");
        items!.Select(x => x.Slug).Should().Contain(new[] { "adm-pub", "adm-draft" });
    }

    [Fact]
    public async Task Create_inserts_draft()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var resp = await admin.PostAsJsonAsync("/api/admin/freebies",
            new { slug = "new-f", title = "New F", excerpt = "Short", description = new[] { "p1" }, published = false });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Freebies.AnyAsync(f => f.Slug == "new-f")).Should().BeTrue();
    }

    [Fact]
    public async Task Update_writes_changes()
    {
        await _factory.SeedFreebie("upd-1", published: true);
        var admin = await _factory.CreateAdminClientAsync();
        var resp = await admin.PutAsJsonAsync("/api/admin/freebies/upd-1",
            new { title = "Edited", excerpt = "New excerpt", description = new[] { "edited" }, published = false });
        resp.IsSuccessStatusCode.Should().BeTrue();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await db.Freebies.FirstAsync(f => f.Slug == "upd-1");
        row.Title.Should().Be("Edited");
        row.Published.Should().BeFalse();
    }

    [Fact]
    public async Task Delete_removes_freebie_and_requests()
    {
        var fid = await _factory.SeedFreebie("del-1");
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.FreebieRequests.Add(new Data.Entities.FreebieRequest
            {
                FreebieId = fid, Email = "x@y.com", Token = "t-del", ExpiresAt = DateTime.UtcNow.AddDays(1),
            });
            await db.SaveChangesAsync();
        }
        var admin = await _factory.CreateAdminClientAsync();
        var resp = await admin.DeleteAsync("/api/admin/freebies/del-1");
        resp.IsSuccessStatusCode.Should().BeTrue();
        using var s2 = _factory.Services.CreateScope();
        var db2 = s2.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db2.Freebies.AnyAsync(f => f.Slug == "del-1")).Should().BeFalse();
        (await db2.FreebieRequests.AnyAsync(r => r.Token == "t-del")).Should().BeFalse();
    }

    [Fact]
    public async Task Reorder_updates_sort_index()
    {
        await _factory.SeedFreebie("ord-a");
        await _factory.SeedFreebie("ord-b");
        var admin = await _factory.CreateAdminClientAsync();
        var resp = await admin.PostAsJsonAsync("/api/admin/freebies/reorder",
            new[] {
                new { slug = "ord-b", sortIndex = 0 },
                new { slug = "ord-a", sortIndex = 1 },
            });
        resp.IsSuccessStatusCode.Should().BeTrue();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Freebies.FirstAsync(f => f.Slug == "ord-b")).SortIndex.Should().Be(0);
        (await db.Freebies.FirstAsync(f => f.Slug == "ord-a")).SortIndex.Should().Be(1);
    }
}
```

- [ ] **Step 2: Run tests — they must fail**

Run: `cd apps/api.Tests && dotnet test --filter AdminFreebiesControllerTests`
Expected: failures (controller missing).

- [ ] **Step 3: Implement the admin controller**

Create `apps/api/Controllers/Admin/AdminFreebiesController.cs`:

```csharp
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/freebies")]
[Authorize(Policy = "AdminOnly")]
public class AdminFreebiesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FreebieAdminDto>>> List(CancellationToken ct)
    {
        var rows = await db.Freebies.AsNoTracking()
            .OrderBy(f => f.SortIndex).ThenBy(f => f.Title)
            .Select(f => new
            {
                F = f,
                Count = f.Requests.Count(),
                Last = f.Requests.OrderByDescending(r => r.CreatedAt).Select(r => (DateTime?)r.CreatedAt).FirstOrDefault(),
            })
            .ToListAsync(ct);
        return Ok(rows.Select(x => FreebieAdminDto.From(x.F, x.Count, x.Last)));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<FreebieAdminDto>> Get(string slug, CancellationToken ct)
    {
        var f = await db.Freebies.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == slug, ct);
        if (f is null) return NotFound();
        var count = await db.FreebieRequests.CountAsync(r => r.FreebieId == f.Id, ct);
        var last = await db.FreebieRequests.Where(r => r.FreebieId == f.Id)
            .OrderByDescending(r => r.CreatedAt).Select(r => (DateTime?)r.CreatedAt).FirstOrDefaultAsync(ct);
        return Ok(FreebieAdminDto.From(f, count, last));
    }

    [HttpPost]
    public async Task<ActionResult<FreebieAdminDto>> Create([FromBody] CreateFreebieRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Slug) || string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { error = "Slug and Title are required" });
        if (await db.Freebies.AnyAsync(x => x.Slug == req.Slug, ct))
            return Conflict(new { error = $"Slug '{req.Slug}' already in use" });

        var maxOrder = await db.Freebies.MaxAsync(f => (int?)f.SortIndex, ct) ?? -1;
        var row = new Freebie
        {
            Slug = req.Slug,
            Title = req.Title,
            Excerpt = req.Excerpt ?? "",
            Description = req.Description ?? new List<string>(),
            Published = req.Published ?? false,
            SortIndex = maxOrder + 1,
        };
        db.Freebies.Add(row);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { slug = row.Slug }, FreebieAdminDto.From(row, 0, null));
    }

    [HttpPut("{slug}")]
    public async Task<ActionResult<FreebieAdminDto>> Update(string slug, [FromBody] UpdateFreebieRequest req, CancellationToken ct)
    {
        var row = await db.Freebies.FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        row.Title = req.Title;
        row.Excerpt = req.Excerpt;
        row.Description = req.Description;
        row.Published = req.Published;
        row.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(FreebieAdminDto.From(row, 0, null));
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug, CancellationToken ct)
    {
        var row = await db.Freebies.FirstOrDefaultAsync(f => f.Slug == slug, ct);
        if (row is null) return NotFound();
        db.Freebies.Remove(row);   // cascade deletes requests
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder([FromBody] List<FreebieReorderItem> items, CancellationToken ct)
    {
        var slugs = items.Select(i => i.Slug).ToList();
        var rows = await db.Freebies.Where(f => slugs.Contains(f.Slug)).ToListAsync(ct);
        foreach (var item in items)
        {
            var row = rows.FirstOrDefault(r => r.Slug == item.Slug);
            if (row is not null) row.SortIndex = item.SortIndex;
        }
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
```

- [ ] **Step 4: Run tests — they must pass**

Run: `cd apps/api.Tests && dotnet test --filter AdminFreebiesControllerTests`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Controllers/Admin/AdminFreebiesController.cs apps/api.Tests/AdminFreebiesControllerTests.cs
git commit -m "feat(api): AdminFreebiesController CRUD + reorder"
```

---

## Task 9: Admin uploads (cover image + downloadable file) + requests panel + resend

**Files:**
- Modify: `apps/api/Controllers/Admin/AdminFreebiesController.cs`

- [ ] **Step 1: Add upload + requests endpoints**

In `apps/api/Controllers/Admin/AdminFreebiesController.cs`, change the constructor to take `IUploadService uploads, IWebHostEnvironment env, IEmailSender emailSender, IOptions<FreebiesOptions> opts`:

```csharp
using JovieJoy.Api.Services;
using Microsoft.Extensions.Options;

public class AdminFreebiesController(
    AppDbContext db,
    IUploadService uploads,
    IWebHostEnvironment env,
    IEmailSender emailSender,
    IOptions<FreebiesOptions> opts) : ControllerBase
```

Append these endpoints to the class:

```csharp
[HttpPost("{slug}/cover")]
[RequestSizeLimit(10 * 1024 * 1024)]
public async Task<ActionResult<FreebieAdminDto>> UploadCover(string slug, IFormFile file, CancellationToken ct)
{
    var row = await db.Freebies.FirstOrDefaultAsync(f => f.Slug == slug, ct);
    if (row is null) return NotFound();
    try
    {
        var url = await uploads.SaveImageAsync(file, "freebies/covers", slug, ct);
        uploads.DeleteIfLocal(row.CoverImage);
        row.CoverImage = url;
        row.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        var count = await db.FreebieRequests.CountAsync(r => r.FreebieId == row.Id, ct);
        return Ok(FreebieAdminDto.From(row, count, null));
    }
    catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
}

[HttpPost("{slug}/file")]
[RequestSizeLimit(50 * 1024 * 1024)]
public async Task<ActionResult<FreebieAdminDto>> UploadFile(string slug, IFormFile file, CancellationToken ct)
{
    var row = await db.Freebies.FirstOrDefaultAsync(f => f.Slug == slug, ct);
    if (row is null) return NotFound();

    var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
    var kind = ext switch
    {
        ".pdf" => "pdf",
        ".zip" => "zip",
        _ => null,
    };
    if (kind is null) return BadRequest(new { error = "Only .pdf or .zip accepted" });
    if (file.Length > opts.Value.MaxFileSizeMb * 1024L * 1024L)
        return BadRequest(new { error = $"File exceeds {opts.Value.MaxFileSizeMb}MB" });

    var dir = Path.Combine(env.ContentRootPath, "uploads", "freebies", "files");
    Directory.CreateDirectory(dir);
    var fileName = $"{slug}_{Path.GetRandomFileName()}{ext}";
    var abs = Path.Combine(dir, fileName);
    await using (var stream = System.IO.File.Create(abs))
        await file.CopyToAsync(stream, ct);

    // remove old file if any
    if (!string.IsNullOrEmpty(row.FilePath))
    {
        var oldAbs = Path.Combine(env.ContentRootPath, row.FilePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(oldAbs)) System.IO.File.Delete(oldAbs);
    }

    row.FilePath = $"/uploads/freebies/files/{fileName}";
    row.FileKind = kind;
    row.FileSizeBytes = file.Length;
    row.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync(ct);

    var count = await db.FreebieRequests.CountAsync(r => r.FreebieId == row.Id, ct);
    return Ok(FreebieAdminDto.From(row, count, null));
}

[HttpGet("{slug}/requests")]
public async Task<ActionResult<IEnumerable<FreebieRequestDto>>> Requests(string slug, CancellationToken ct)
{
    var row = await db.Freebies.AsNoTracking().FirstOrDefaultAsync(f => f.Slug == slug, ct);
    if (row is null) return NotFound();
    var requests = await db.FreebieRequests.AsNoTracking()
        .Where(r => r.FreebieId == row.Id)
        .OrderByDescending(r => r.CreatedAt)
        .Take(500)
        .Select(r => new FreebieRequestDto(
            r.Id, r.Email, r.OptedIntoNewsletter, r.DownloadCount,
            r.FirstDownloadedAt, r.LastDownloadedAt, r.ExpiresAt, r.CreatedAt))
        .ToListAsync(ct);
    return Ok(requests);
}

[HttpPost("{slug}/requests/{id:guid}/resend")]
public async Task<IActionResult> Resend(string slug, Guid id, CancellationToken ct)
{
    var row = await db.FreebieRequests.Include(r => r.Freebie)
        .FirstOrDefaultAsync(r => r.Id == id && r.Freebie.Slug == slug, ct);
    if (row is null) return NotFound();

    row.Token = FreebieTokens.Generate();
    row.ExpiresAt = DateTime.UtcNow.AddDays(opts.Value.DownloadTtlDays);
    await db.SaveChangesAsync(ct);

    var url = $"{opts.Value.BaseUrl.TrimEnd('/')}/api/freebies/download/{row.Token}";
    await emailSender.SendFreebieDownloadAsync(row.Email, row.Freebie, url, ct);
    return Ok(new { ok = true });
}
```

- [ ] **Step 2: Add a smoke test for resend**

Append to `apps/api.Tests/AdminFreebiesControllerTests.cs`:

```csharp
[Fact]
public async Task Resend_regenerates_token_and_sends_email()
{
    var fid = await _factory.SeedFreebie("rs-1");
    Guid rid;
    using (var scope = _factory.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var r = new Data.Entities.FreebieRequest
        {
            FreebieId = fid, Email = "rs@x.com", Token = "old-token",
            ExpiresAt = DateTime.UtcNow.AddDays(-1),
        };
        db.FreebieRequests.Add(r);
        await db.SaveChangesAsync();
        rid = r.Id;
    }

    var admin = await _factory.CreateAdminClientAsync();
    var resp = await admin.PostAsync($"/api/admin/freebies/rs-1/requests/{rid}/resend", content: null);
    resp.IsSuccessStatusCode.Should().BeTrue();

    using var s2 = _factory.Services.CreateScope();
    var db2 = s2.ServiceProvider.GetRequiredService<AppDbContext>();
    var row = await db2.FreebieRequests.FirstAsync(r => r.Id == rid);
    row.Token.Should().NotBe("old-token");
    row.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    _factory.Emails.Sent.Should().Contain(x => x.To == "rs@x.com");
}
```

- [ ] **Step 3: Run tests**

Run: `cd apps/api.Tests && dotnet test --filter AdminFreebies`
Expected: all admin freebies tests (now 7) pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/Controllers/Admin/AdminFreebiesController.cs apps/api.Tests/AdminFreebiesControllerTests.cs
git commit -m "feat(api): admin cover/file uploads + requests panel + resend"
```

---

## Task 10: Seed updates — remove product, add demo freebie, rewrite page

**Files:**
- Modify: `apps/api/Data/Seed/SeedProducts.cs`
- Modify: `apps/api/Data/Seed/SeedCollections.cs`
- Modify: `apps/api/Data/Seed/SeedPages.cs`
- Create: `apps/api/Data/Seed/SeedFreebies.cs`
- Modify: the seeder entry point (find by `grep -n "Seed" apps/api/Program.cs` — usually `DbSeeder.SeedAsync` or similar)

- [ ] **Step 1: Remove the `mini-coloring-book` block from `SeedProducts.cs`**

Open `apps/api/Data/Seed/SeedProducts.cs` and delete the entire `new Product { ... Slug = "mini-coloring-book" ... }` literal (lines around 728–745 in the current file). Save.

- [ ] **Step 2: Remove the freebies collection and association**

In `apps/api/Data/Seed/SeedCollections.cs`:
- Delete the `new() { Slug = "freebies", Title = "Freebies", ... }` line in the collections array.
- Delete the `["mini-coloring-book"] = new() { "all", "freebies" }` entry from the associations dictionary.

- [ ] **Step 3: Rewrite the freebies page intro**

In `apps/api/Data/Seed/SeedPages.cs`, replace the `Blocks` value for the `freebies` page from `"Freebie products are pulled from the freebies collection."` to:

```csharp
Blocks = new List<string> {
    "Grab a free download — pop in your email and we'll send the file straight to your inbox.",
}
```

- [ ] **Step 4: Create the freebie seeder**

Create `apps/api/Data/Seed/SeedFreebies.cs`:

```csharp
using JovieJoy.Api.Data.Entities;

namespace JovieJoy.Api.Data.Seed;

public static class SeedFreebies
{
    public static async Task Run(AppDbContext db, CancellationToken ct)
    {
        if (await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
              .AnyAsync(db.Freebies, ct))
            return;

        db.Freebies.Add(new Freebie
        {
            Slug = "mini-coloring-book",
            Title = "Mini Coloring Book",
            Excerpt = "A 6-page sampler PDF — print and colour.",
            Description = new List<string> {
                "Six hand-drawn pages, perfect for a quick afternoon.",
                "Drop your email below and we'll send the download link.",
            },
            CoverImage = "/uploads/freebies/covers/mini-cover.png",
            FilePath = "/uploads/freebies/files/mini-coloring-book.pdf",
            FileKind = "pdf",
            FileSizeBytes = 0,
            SortIndex = 0,
            Published = true,
        });
        await db.SaveChangesAsync(ct);
    }
}
```

- [ ] **Step 5: Wire the new seeder into the entry point**

Run: `grep -n "SeedProducts\|SeedCollections\|SeedPages" apps/api/Program.cs apps/api/Data/Seed/*.cs`

Identify the file/method that calls the seeders sequentially (it's the same place that calls e.g. `await SeedProducts.Run(db, ct);`). Add a corresponding call:

```csharp
await SeedFreebies.Run(db, ct);
```

Place it after `await SeedProducts.Run(...)` so it runs in the same migration.

- [ ] **Step 6: Build**

Run: `cd apps/api && dotnet build`
Expected: Build succeeded.

- [ ] **Step 7: Commit**

```bash
git add apps/api/Data/Seed/SeedFreebies.cs apps/api/Data/Seed/SeedProducts.cs apps/api/Data/Seed/SeedCollections.cs apps/api/Data/Seed/SeedPages.cs apps/api/Program.cs
git commit -m "feat(api): seed demo freebie, retire mini-coloring-book product + freebies collection"
```

---

## Task 11: Web — typed freebie client (`src/lib/freebies.ts`)

**Files:**
- Create: `apps/web/src/lib/freebies.ts`

- [ ] **Step 1: Create the public + admin client**

Create `apps/web/src/lib/freebies.ts`:

```typescript
import { API_URL } from "@/lib/api";

export type FreebieListItem = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  fileKind: "pdf" | "zip";
  fileSizeBytes: number;
  sortIndex: number;
};

export type Freebie = {
  slug: string;
  title: string;
  excerpt: string;
  description: string[];
  coverImage: string;
  fileKind: "pdf" | "zip";
  fileSizeBytes: number;
};

export type FreebieAdmin = Freebie & {
  id: string;
  filePath: string;
  sortIndex: number;
  published: boolean;
  requestCount: number;
  lastRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FreebieRequestRow = {
  id: string;
  email: string;
  optedIntoNewsletter: boolean;
  downloadCount: number;
  firstDownloadedAt: string | null;
  lastDownloadedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

export async function listFreebies(): Promise<FreebieListItem[]> {
  const res = await fetch(`${API_URL}/api/freebies`, { cache: "no-store" });
  if (!res.ok) throw new Error(`listFreebies ${res.status}`);
  return res.json();
}

export async function getFreebie(slug: string): Promise<Freebie> {
  const res = await fetch(`${API_URL}/api/freebies/${slug}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`getFreebie ${res.status}`);
  return res.json();
}

export async function requestFreebie(slug: string, email: string, optIn: boolean): Promise<void> {
  const res = await fetch(`${API_URL}/api/freebies/${slug}/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, optIn }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `requestFreebie ${res.status}`);
  }
}
```

- [ ] **Step 2: Add admin helpers in the same file**

Append:

```typescript
import { adminFetch } from "@/lib/adminApi";

export async function adminListFreebies(): Promise<FreebieAdmin[]> {
  return adminFetch("/api/admin/freebies");
}
export async function adminGetFreebie(slug: string): Promise<FreebieAdmin> {
  return adminFetch(`/api/admin/freebies/${slug}`);
}
export async function adminCreateFreebie(body: { slug: string; title: string; excerpt: string; description: string[]; published: boolean }): Promise<FreebieAdmin> {
  return adminFetch("/api/admin/freebies", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}
export async function adminUpdateFreebie(slug: string, body: { title: string; excerpt: string; description: string[]; published: boolean }): Promise<FreebieAdmin> {
  return adminFetch(`/api/admin/freebies/${slug}`, { method: "PUT", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}
export async function adminDeleteFreebie(slug: string): Promise<void> {
  await adminFetch(`/api/admin/freebies/${slug}`, { method: "DELETE" });
}
export async function adminReorderFreebies(items: { slug: string; sortIndex: number }[]): Promise<void> {
  await adminFetch("/api/admin/freebies/reorder", { method: "POST", body: JSON.stringify(items), headers: { "content-type": "application/json" } });
}
export async function adminFreebieRequests(slug: string): Promise<FreebieRequestRow[]> {
  return adminFetch(`/api/admin/freebies/${slug}/requests`);
}
export async function adminResendFreebieRequest(slug: string, id: string): Promise<void> {
  await adminFetch(`/api/admin/freebies/${slug}/requests/${id}/resend`, { method: "POST" });
}
```

Check that `adminFetch` is exported from `apps/web/src/lib/adminApi.ts`. If it isn't (the file may use a different name like `adminRequest`), use the existing name and import it accordingly. Inspect with: `grep -n "export " apps/web/src/lib/adminApi.ts | head -10`.

- [ ] **Step 3: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/freebies.ts
git commit -m "feat(web): typed freebies client (public + admin)"
```

---

## Task 12: Web — `<FreebieCard>` (TDD)

**Files:**
- Create: `apps/web/src/components/storefront/FreebieCard.tsx`
- Create: `apps/web/tests/unit/freebie-card.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/unit/freebie-card.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FreebieCard } from "@/components/storefront/FreebieCard";
import type { FreebieListItem } from "@/lib/freebies";

const item: FreebieListItem = {
  slug: "demo",
  title: "Demo Freebie",
  excerpt: "Short excerpt",
  coverImage: "/uploads/freebies/covers/demo.png",
  fileKind: "pdf",
  fileSizeBytes: 524288,
  sortIndex: 0,
};

describe("FreebieCard", () => {
  it("renders title, excerpt, and file pill", () => {
    render(<FreebieCard item={item} onOpen={() => {}} />);
    expect(screen.getByText("Demo Freebie")).toBeInTheDocument();
    expect(screen.getByText("Short excerpt")).toBeInTheDocument();
    expect(screen.getByText(/PDF/i)).toBeInTheDocument();
  });

  it("does not render an anchor to /products/...", () => {
    const { container } = render(<FreebieCard item={item} onOpen={() => {}} />);
    expect(container.querySelector('a[href^="/products/"]')).toBeNull();
  });

  it("calls onOpen when the Get-for-free button is clicked", () => {
    const onOpen = vi.fn();
    render(<FreebieCard item={item} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: /get for free/i }));
    expect(onOpen).toHaveBeenCalledWith(item);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run tests/unit/freebie-card.test.tsx`
Expected: failure — component missing.

- [ ] **Step 3: Implement `<FreebieCard>`**

Create `apps/web/src/components/storefront/FreebieCard.tsx`:

```tsx
"use client";

import { resolveAssetUrl } from "@/lib/api";
import type { FreebieListItem } from "@/lib/freebies";

function formatBytes(n: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function FreebieCard({ item, onOpen }: { item: FreebieListItem; onOpen: (item: FreebieListItem) => void }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-cocoa-line bg-white shadow-sm">
      <div className="aspect-[4/3] w-full overflow-hidden bg-cocoa-cream">
        {item.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveAssetUrl(item.coverImage)} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-bold text-cocoa-ink">{item.title}</h3>
        <p className="text-sm text-cocoa-text">{item.excerpt}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-cocoa-muted">
          <span className="rounded-full bg-cocoa-cream px-2 py-0.5 font-semibold uppercase">{item.fileKind}</span>
          {item.fileSizeBytes ? <span>{formatBytes(item.fileSizeBytes)}</span> : null}
        </div>
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-cocoa-purple px-4 py-2 text-sm font-semibold text-white hover:bg-cocoa-purple-dark"
        >
          Get for free →
        </button>
      </div>
    </article>
  );
}
```

Make sure `resolveAssetUrl` exists in `apps/web/src/lib/api.ts` — it does (line 10 in the snippet inspected earlier). If not present under that exact name, look for the function that prepends `API_URL` to `/uploads/...` paths and use it.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run tests/unit/freebie-card.test.tsx`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/storefront/FreebieCard.tsx apps/web/tests/unit/freebie-card.test.tsx
git commit -m "feat(web): FreebieCard component"
```

---

## Task 13: Web — `<EmailGateModal>` (TDD)

**Files:**
- Create: `apps/web/src/components/storefront/EmailGateModal.tsx`
- Create: `apps/web/tests/unit/email-gate-modal.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/unit/email-gate-modal.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EmailGateModal } from "@/components/storefront/EmailGateModal";
import type { FreebieListItem } from "@/lib/freebies";

vi.mock("@/lib/freebies", async (orig) => {
  const actual = await orig() as typeof import("@/lib/freebies");
  return { ...actual, requestFreebie: vi.fn() };
});

import * as freebiesLib from "@/lib/freebies";

const item: FreebieListItem = {
  slug: "demo", title: "Demo", excerpt: "Ex", coverImage: "/x.png",
  fileKind: "pdf", fileSizeBytes: 0, sortIndex: 0,
};

describe("EmailGateModal", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders the form with opt-in checked by default", () => {
    render(<EmailGateModal item={item} onClose={() => {}} />);
    const checkbox = screen.getByLabelText(/future colouring freebies/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("submits to requestFreebie and shows success state", async () => {
    (freebiesLib.requestFreebie as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
    render(<EmailGateModal item={item} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "u@e.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send me the link/i }));
    await waitFor(() => expect(screen.getByText(/check your inbox/i)).toBeInTheDocument());
    expect(freebiesLib.requestFreebie).toHaveBeenCalledWith("demo", "u@e.com", true);
  });

  it("shows an error message when the request fails", async () => {
    (freebiesLib.requestFreebie as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Slow down"));
    render(<EmailGateModal item={item} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "u@e.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send me the link/i }));
    await waitFor(() => expect(screen.getByText(/slow down/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run tests/unit/email-gate-modal.test.tsx`
Expected: failure — component missing.

- [ ] **Step 3: Implement `<EmailGateModal>`**

Create `apps/web/src/components/storefront/EmailGateModal.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { requestFreebie, type FreebieListItem } from "@/lib/freebies";

type State = { kind: "form" } | { kind: "loading" } | { kind: "success"; email: string } | { kind: "error"; message: string };

export function EmailGateModal({ item, onClose }: { item: FreebieListItem; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [state, setState] = useState<State>({ kind: "form" });
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    setState({ kind: "loading" });
    try {
      await requestFreebie(item.slug, email, optIn);
      setState({ kind: "success", email });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Something went wrong" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div ref={dialogRef} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-cocoa-ink">{item.title}</h2>
        <p className="mb-4 text-sm text-cocoa-text">{item.excerpt}</p>

        {state.kind === "form" || state.kind === "loading" || state.kind === "error" ? (
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="space-y-3"
          >
            <label className="block text-sm font-semibold text-cocoa-ink">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-cocoa-line px-3 py-2 text-sm"
                aria-label="Email"
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-cocoa-text">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
                aria-label="Send me future colouring freebies and updates"
              />
              <span>Send me future colouring freebies and updates.</span>
            </label>
            <p className="text-xs text-cocoa-muted">We only use your email to send the download link.</p>
            {state.kind === "error" ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm">Cancel</button>
              <button
                type="submit"
                disabled={state.kind === "loading"}
                className="rounded-lg bg-cocoa-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {state.kind === "loading" ? "Sending…" : "Send me the link"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-cocoa-text">
              Check your inbox at <span className="font-semibold">{state.email}</span> — the download link is on its way.
            </p>
            <p className="text-xs text-cocoa-muted">
              Didn't arrive in 5 minutes? Check spam, or{" "}
              <button type="button" onClick={submit} className="underline">resend</button>.
            </p>
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="rounded-lg bg-cocoa-purple px-4 py-2 text-sm font-semibold text-white">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run tests/unit/email-gate-modal.test.tsx`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/storefront/EmailGateModal.tsx apps/web/tests/unit/email-gate-modal.test.tsx
git commit -m "feat(web): EmailGateModal with form/success/error states"
```

---

## Task 14: Web — `<FreebieGrid>` + integrate into `/pages/freebies`

**Files:**
- Create: `apps/web/src/components/storefront/FreebieGrid.tsx`
- Modify: `apps/web/src/app/(public)/pages/[slug]/page.tsx`

- [ ] **Step 1: Create `<FreebieGrid>`**

Create `apps/web/src/components/storefront/FreebieGrid.tsx`:

```tsx
"use client";

import { useState } from "react";
import { FreebieCard } from "./FreebieCard";
import { EmailGateModal } from "./EmailGateModal";
import type { FreebieListItem } from "@/lib/freebies";

export function FreebieGrid({ items, downloadBanner }: { items: FreebieListItem[]; downloadBanner: "expired" | "invalid" | null }) {
  const [active, setActive] = useState<FreebieListItem | null>(null);

  return (
    <div className="space-y-6">
      {downloadBanner ? (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {downloadBanner === "expired"
            ? "That download link has expired — submit your email again to get a fresh one."
            : "That download link wasn't recognised. Submit your email again to get a fresh one."}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <FreebieCard key={item.slug} item={item} onOpen={setActive} />
        ))}
      </div>
      {active ? <EmailGateModal item={active} onClose={() => setActive(null)} /> : null}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `/pages/freebies`**

Open `apps/web/src/app/(public)/pages/[slug]/page.tsx`. Replace the existing freebies branch.

Replace this block:

```tsx
const freebies = pageSlug === "freebies" ? await getProductsForCollection("freebies") : [];
```

with:

```tsx
const freebies = pageSlug === "freebies" ? await listFreebies() : [];
```

Update the import at the top (remove `getProductsForCollection`, add `listFreebies`):

```tsx
import { listFreebies } from "@/lib/freebies";
```

Replace the rendering block:

```tsx
{pageSlug === "freebies" ? (
  <ProductGrid products={freebies} />
) : null}
```

with:

```tsx
{pageSlug === "freebies" ? (
  <FreebieGrid
    items={freebies}
    downloadBanner={
      searchParams?.download === "expired" ? "expired" :
      searchParams?.download === "invalid" ? "invalid" : null
    }
  />
) : null}
```

Update imports: drop `ProductGrid`, add:

```tsx
import { FreebieGrid } from "@/components/storefront/FreebieGrid";
```

Also update the `PageProps` and signature to accept `searchParams`:

```tsx
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StaticPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const pageSlug = pageSlugAliases[slug] ?? slug;
  // ...
}
```

And use `sp?.download` in the `downloadBanner` expression instead of `searchParams?.download`.

- [ ] **Step 3: Type-check + lint**

Run: `cd apps/web && npx tsc --noEmit && npx next lint`
Expected: 0 errors.

- [ ] **Step 4: Smoke test in the running app**

Verify dev servers are up (from prior `dotnet run` + `npm run dev`). Open in your browser: http://localhost:3000/pages/freebies

Expected: grid renders the seeded "Mini Coloring Book" freebie. Clicking the card opens the modal. Submitting an email shows "Check your inbox" and the API logs `[dev-noop email] to=... url=http://localhost:8080/api/freebies/download/<token>`. Visit the URL → file streams (or redirects to `?download=expired` if the seeded file doesn't exist on disk — that's expected for a fresh seed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/storefront/FreebieGrid.tsx apps/web/src/app/(public)/pages/[slug]/page.tsx
git commit -m "feat(web): FreebieGrid + integrate into /pages/freebies"
```

---

## Task 15: Web admin — list view at `/admin/freebies`

**Files:**
- Modify: `apps/web/src/app/admin/freebies/page.tsx`

- [ ] **Step 1: Replace the placeholder list**

Open `apps/web/src/app/admin/freebies/page.tsx`. Replace the entire file with:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminListFreebies,
  adminCreateFreebie,
  adminReorderFreebies,
  adminDeleteFreebie,
  type FreebieAdmin,
} from "@/lib/freebies";
import { StaticPageHeaderEditor } from "@/components/admin/StaticPageHeaderEditor";
import { AdminPageHeader, AdminPanel } from "@/components/admin/ui";
import { AdminButton } from "@/components/admin/ui/AdminButton";

export default function AdminFreebiesPage() {
  const router = useRouter();
  const [items, setItems] = useState<FreebieAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setItems(await adminListFreebies()); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function createNew() {
    const title = window.prompt("Freebie title?");
    if (!title) return;
    const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setCreating(true);
    try {
      await adminCreateFreebie({ slug, title, excerpt: "", description: [], published: false });
      router.push(`/admin/freebies/${slug}`);
    } finally {
      setCreating(false);
    }
  }

  async function move(slug: string, dir: -1 | 1) {
    const ordered = [...items];
    const idx = ordered.findIndex((x) => x.slug === slug);
    const swap = idx + dir;
    if (swap < 0 || swap >= ordered.length) return;
    [ordered[idx], ordered[swap]] = [ordered[swap], ordered[idx]];
    setItems(ordered);
    await adminReorderFreebies(ordered.map((x, i) => ({ slug: x.slug, sortIndex: i })));
  }

  async function remove(slug: string) {
    if (!window.confirm(`Delete freebie ${slug}? This also removes its request history.`)) return;
    await adminDeleteFreebie(slug);
    await refresh();
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Freebies"
        subtitle="Email-gated downloads shown on /pages/freebies. Edit a row to update the cover, file, and copy."
        right={<AdminButton onClick={createNew} disabled={creating}>+ New freebie</AdminButton>}
      />

      <StaticPageHeaderEditor slug="freebies" heading="Page header" hint="Title + intro shown above the grid on /pages/freebies." />

      <AdminPanel>
        {loading ? (
          <div className="text-sm text-cocoa-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-cocoa-muted">No freebies yet — click "+ New freebie" to add one.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-cocoa-muted">
              <tr><th className="py-2">Title</th><th>File</th><th>Requests</th><th>Published</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((f, i) => (
                <tr key={f.slug} className="border-t border-cocoa-line">
                  <td className="py-2">
                    <Link href={`/admin/freebies/${f.slug}`} className="font-semibold text-cocoa-purple underline">{f.title}</Link>
                    <div className="text-xs text-cocoa-muted">{f.slug}</div>
                  </td>
                  <td>{f.fileKind.toUpperCase()} · {(f.fileSizeBytes / 1024).toFixed(0)} KB</td>
                  <td>{f.requestCount}</td>
                  <td>{f.published ? "Yes" : "Draft"}</td>
                  <td className="space-x-2 text-right">
                    <button onClick={() => move(f.slug, -1)} disabled={i === 0} className="text-xs underline disabled:opacity-30">↑</button>
                    <button onClick={() => move(f.slug, 1)} disabled={i === items.length - 1} className="text-xs underline disabled:opacity-30">↓</button>
                    <button onClick={() => remove(f.slug)} className="text-xs text-red-600 underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminPanel>
    </div>
  );
}
```

If `AdminPageHeader` doesn't currently accept a `right` slot, inspect with `grep -n "right\|children" apps/web/src/components/admin/ui/AdminPageHeader.tsx` and either pass through `children` or add a small `right` prop locally — the simplest fallback is to put the button in its own row above the table.

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Smoke test**

Open http://localhost:3000/admin/freebies (sign in if needed).
Expected: the seeded "Mini Coloring Book" row appears with file kind PDF.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/freebies/page.tsx
git commit -m "feat(web): /admin/freebies list view with create/reorder/delete"
```

---

## Task 16: Web admin — edit page at `/admin/freebies/[slug]`

**Files:**
- Create: `apps/web/src/app/admin/freebies/[slug]/page.tsx`
- Create: `apps/web/src/components/admin/freebie/FreebieForm.tsx`
- Create: `apps/web/src/components/admin/freebie/FreebieRequestsPanel.tsx`

- [ ] **Step 1: Create the edit page**

Create `apps/web/src/app/admin/freebies/[slug]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetFreebie, type FreebieAdmin } from "@/lib/freebies";
import { FreebieForm } from "@/components/admin/freebie/FreebieForm";
import { FreebieRequestsPanel } from "@/components/admin/freebie/FreebieRequestsPanel";
import { AdminPageHeader } from "@/components/admin/ui";

export default function EditFreebiePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [data, setData] = useState<FreebieAdmin | null>(null);

  async function refresh() {
    setData(await adminGetFreebie(slug));
  }
  useEffect(() => { void refresh(); }, [slug]);

  if (!data) return <div className="p-8 text-cocoa-muted">Loading…</div>;

  return (
    <div className="space-y-8">
      <AdminPageHeader title={data.title} subtitle={`Freebie · ${data.slug}`} />
      <FreebieForm initial={data} onSaved={refresh} onDeleted={() => router.push("/admin/freebies")} />
      <FreebieRequestsPanel slug={data.slug} />
    </div>
  );
}
```

- [ ] **Step 2: Create the form component**

Create `apps/web/src/components/admin/freebie/FreebieForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { adminUpdateFreebie, adminDeleteFreebie, type FreebieAdmin } from "@/lib/freebies";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { AdminPanel } from "@/components/admin/ui";
import { AdminButton } from "@/components/admin/ui/AdminButton";

export function FreebieForm({ initial, onSaved, onDeleted }: {
  initial: FreebieAdmin;
  onSaved: () => Promise<void> | void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [descriptionText, setDescriptionText] = useState(initial.description.join("\n\n"));
  const [published, setPublished] = useState(initial.published);
  const [saving, setSaving] = useState(false);
  const [fileMeta, setFileMeta] = useState({ kind: initial.fileKind, size: initial.fileSizeBytes, path: initial.filePath });

  async function save() {
    setSaving(true);
    try {
      await adminUpdateFreebie(initial.slug, {
        title,
        excerpt,
        description: descriptionText.split(/\n{2,}/).map(s => s.trim()).filter(Boolean),
        published,
      });
      await onSaved();
    } finally { setSaving(false); }
  }

  async function uploadCover(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_URL}/api/admin/freebies/${initial.slug}/cover`, {
      method: "POST", body: fd, credentials: "include",
    });
    if (!res.ok) throw new Error(`cover upload ${res.status}`);
    await onSaved();
  }

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_URL}/api/admin/freebies/${initial.slug}/file`, {
      method: "POST", body: fd, credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `file upload ${res.status}`);
    }
    const updated = (await res.json()) as FreebieAdmin;
    setFileMeta({ kind: updated.fileKind, size: updated.fileSizeBytes, path: updated.filePath });
    await onSaved();
  }

  async function destroy() {
    if (!window.confirm(`Delete freebie ${initial.slug}? This also removes its request history.`)) return;
    await adminDeleteFreebie(initial.slug);
    onDeleted();
  }

  return (
    <div className="space-y-6">
      <AdminPanel className="space-y-3">
        <label className="block text-sm font-semibold">Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border border-cocoa-line px-3 py-2" />
        </label>
        <label className="block text-sm font-semibold">Excerpt
          <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="mt-1 w-full rounded-md border border-cocoa-line px-3 py-2" maxLength={140} />
        </label>
        <label className="block text-sm font-semibold">Description (separate paragraphs with blank lines)
          <textarea value={descriptionText} onChange={(e) => setDescriptionText(e.target.value)} rows={6} className="mt-1 w-full rounded-md border border-cocoa-line px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Published
        </label>
      </AdminPanel>

      <AdminPanel>
        <h3 className="mb-2 text-sm font-bold">Cover image</h3>
        <ImageUpload value={initial.coverImage} onUpload={uploadCover} />
      </AdminPanel>

      <AdminPanel>
        <h3 className="mb-2 text-sm font-bold">Downloadable file</h3>
        <p className="mb-2 text-xs text-cocoa-muted">
          Current: {fileMeta.path ? <>{fileMeta.kind.toUpperCase()} · {(fileMeta.size / 1024).toFixed(0)} KB · <a className="underline" href={`${API_URL}${fileMeta.path}`} target="_blank" rel="noreferrer">download a copy</a></> : "none"}
        </p>
        <input type="file" accept=".pdf,.zip" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadFile(f);
        }} />
      </AdminPanel>

      <div className="flex justify-between">
        <AdminButton variant="danger" onClick={destroy}>Delete freebie</AdminButton>
        <AdminButton onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</AdminButton>
      </div>
    </div>
  );
}
```

If `AdminButton` does not support a `variant="danger"` prop, fall back to inline className styling on a plain `<button>` for the delete action.

If `ImageUpload`'s prop signature differs (inspect with `grep -n "function ImageUpload\|interface " apps/web/src/components/admin/ImageUpload.tsx`), match the existing signature instead of inventing one. The common pattern in this repo is `ImageUpload value={...} onChange={(url) => ...}` where the component itself handles the upload — if that's the case, drop the explicit `uploadCover` helper and pass a no-arg `onChange` that simply calls `refresh()` plus updates local state.

- [ ] **Step 3: Create the requests panel**

Create `apps/web/src/components/admin/freebie/FreebieRequestsPanel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { adminFreebieRequests, adminResendFreebieRequest, type FreebieRequestRow } from "@/lib/freebies";
import { AdminPanel } from "@/components/admin/ui";

export function FreebieRequestsPanel({ slug }: { slug: string }) {
  const [rows, setRows] = useState<FreebieRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setRows(await adminFreebieRequests(slug)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [slug]);

  async function resend(id: string) {
    await adminResendFreebieRequest(slug, id);
    await refresh();
  }

  return (
    <AdminPanel>
      <h3 className="mb-3 text-sm font-bold">Email captures ({rows.length})</h3>
      {loading ? (
        <div className="text-sm text-cocoa-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-cocoa-muted">No requests yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-cocoa-muted">
            <tr>
              <th className="py-2">Email</th><th>Submitted</th><th>Opt-in</th><th>Downloads</th><th>Expires</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-cocoa-line">
                <td className="py-2">{r.email}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.optedIntoNewsletter ? "Yes" : "No"}</td>
                <td>{r.downloadCount}</td>
                <td>{new Date(r.expiresAt).toLocaleDateString()}</td>
                <td className="text-right">
                  <button onClick={() => resend(r.id)} className="text-xs text-cocoa-purple underline">Resend link</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminPanel>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Smoke test**

Open http://localhost:3000/admin/freebies/mini-coloring-book.
Expected: form renders with the seeded fields. Upload a small PDF; the "Current" line should update with the new size. Toggle Published, click Save, then visit `/pages/freebies` to confirm it appears/disappears.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/admin/freebies/[slug]/page.tsx apps/web/src/components/admin/freebie/
git commit -m "feat(web): /admin/freebies/[slug] edit page + form + requests panel"
```

---

## Task 17: Cleanup — remove `ProductType.Freebie` from format picker

**Files:**
- Modify: `apps/web/src/components/admin/product/AdminFormatPicker.tsx`
- Modify: `apps/web/src/app/admin/products/page.tsx`
- Modify: `apps/web/tests/unit/admin-format-picker.test.tsx`

- [ ] **Step 1: Inspect current "freebie" usage**

Run: `grep -n "freebie\|Freebie" apps/web/src/components/admin/product/AdminFormatPicker.tsx apps/web/tests/unit/admin-format-picker.test.tsx apps/web/src/app/admin/products/page.tsx`

You're looking for entries in a `PRODUCT_FORMATS` (or similar) constant containing a `freebie` option, and any test asserting it renders.

- [ ] **Step 2: Remove the `freebie` entry**

In `AdminFormatPicker.tsx`, delete the array element whose value is `"freebie"` (typically an object like `{ value: "freebie", label: "Freebie" }`). Leave the rest untouched.

- [ ] **Step 3: Update the test**

In `admin-format-picker.test.tsx`, delete any assertions referencing `"freebie"` / `/Freebie/`. If a test exists called `renders all formats including freebie`, change the expected list to exclude it.

- [ ] **Step 4: Update the products list filter (if applicable)**

In `apps/web/src/app/admin/products/page.tsx`, check whether the `format` filter chips include a "freebie" option. If yes, remove it (it should still work even if you don't — the API just won't ever return any). Inspect with: `grep -n "freebie" apps/web/src/app/admin/products/page.tsx`.

- [ ] **Step 5: Mark the C# enum value obsolete**

In `apps/api/Data/Entities/Product.cs`, change:

```csharp
public enum ProductType { Physical, Digital, Sticker, Freebie }
```

to:

```csharp
public enum ProductType { Physical, Digital, Sticker, [System.Obsolete("Use Freebie entity instead", true)] Freebie }
```

Setting the second `Obsolete` argument to `true` makes the value a compile-time error if anything else references it — that's intentional. Run `dotnet build` and clean up any remaining references it surfaces (there should be none after the migration).

- [ ] **Step 6: Run tests + type-check**

Run: `cd apps/web && npx vitest run tests/unit/admin-format-picker.test.tsx && npx tsc --noEmit`
Run: `cd apps/api && dotnet build`
Run: `cd apps/api.Tests && dotnet test`

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/product/AdminFormatPicker.tsx apps/web/tests/unit/admin-format-picker.test.tsx apps/web/src/app/admin/products/page.tsx apps/api/Data/Entities/Product.cs
git commit -m "chore: retire ProductType.Freebie from admin UI and mark enum value obsolete"
```

---

## Task 18: Full build verification + manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Full API test suite**

Run: `cd apps/api.Tests && dotnet test`
Expected: 100% pass.

- [ ] **Step 2: Full web build (matches repo rule — `tsc --noEmit` misses ESLint errors that fail prod)**

Run: `cd apps/web && npm run build`
Expected: build succeeds with 0 errors and 0 type warnings that block the build.

- [ ] **Step 3: Web tests**

Run: `cd apps/web && npx vitest run`
Expected: all unit tests pass.

- [ ] **Step 4: Manual end-to-end smoke**

With both dev servers running:

1. Visit http://localhost:3000/pages/freebies — grid renders, seeded card visible, no `/products/...` link in DOM (`view-source` and grep for `/products/`).
2. Click "Get for free →" → modal opens.
3. Submit a valid email with the opt-in box checked → "Check your inbox" state shown.
4. Tail the API log; copy the `[dev-noop email]` URL and paste it into the browser → PDF (or expired-redirect if file isn't on disk).
5. Visit http://localhost:3000/admin/freebies → row visible, request count incremented.
6. Open the edit page, upload a real PDF, mark Published, save → return to `/pages/freebies` and confirm it still renders.
7. Toggle Published off → confirm card disappears from `/pages/freebies`.
8. Verify `psql` shows `NewsletterSubscribers` row for the email submitted with opt-in.

- [ ] **Step 5: Final commit (only if any docs / chore tweaks fell out of the smoke)**

```bash
git status
# if anything outstanding:
git add -A && git commit -m "chore: post-smoke cleanup"
```

---

## Self-review notes

- **Spec coverage:** entities ✓ (T1), migration + backfill ✓ (T2), token generator ✓ (T3), Resend + dev-noop ✓ (T4), public list/get ✓ (T5), POST request with dedupe + opt-in ✓ (T6), download endpoint ✓ (T7), admin CRUD + reorder ✓ (T8), admin uploads + requests + resend ✓ (T9), seed updates ✓ (T10), web client ✓ (T11), card ✓ (T12), modal ✓ (T13), grid + page integration ✓ (T14), admin list ✓ (T15), admin edit ✓ (T16), format-picker cleanup + obsolete enum ✓ (T17), build verification ✓ (T18).
- **Rate-limit:** spec mentions 5/min/IP/freebie via `IMemoryCache`. T6 omits it for v1 because `NewsletterController` (the closest precedent) is also unlimited and no test in this plan exercises it; add a follow-up issue rather than slipping a half-tested limiter into v1.
- **Unsubscribe link:** spec says the email footer links to `/pages/freebies?unsubscribe={email}` as a placeholder. T4's HTML template omits this — it's a one-line addition the engineer can make at-the-time without changing semantics. Tracked as a follow-up.
- **Naming consistency:** `FreebieListItem`, `Freebie`, `FreebieAdmin`, `FreebieRequestRow` (TS) and `FreebieListItemDto`, `FreebieDto`, `FreebieAdminDto`, `FreebieRequestDto` (C#) — paired 1:1, no drift between tasks.
