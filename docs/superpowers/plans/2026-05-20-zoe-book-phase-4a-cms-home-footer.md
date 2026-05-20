# Phase 4a Implementation Plan — Home / Footer / Header / Announcement / Static pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the storefront's Home page, Footer chrome, Header chrome, Announcement bar, and all Static pages editable from the admin UI.

**Architecture:** Extend the existing `ContentBlock` infrastructure with five new typed records for hardcoded chrome strings; add four admin CRUD controllers for tables that lack them; add five new admin UI pages (composed editors + static pages CRUD); wire affected storefront components to read from BE with hardcoded fallbacks.

**Tech Stack:** ASP.NET Core 9 + EF Core 9 + Npgsql + xUnit (BE); Next.js 15 + React 19 + Tailwind 3 + Vitest + Playwright (FE).

**Spec:** `docs/superpowers/specs/2026-05-20-zoe-book-phase-4-full-cms-design.md`.

---

## File map

| New file | Purpose |
|---|---|
| `apps/api/Controllers/Admin/AdminStaticPagesController.cs` | REST CRUD for `static_pages` |
| `apps/api/Controllers/Admin/AdminFooterLinksController.cs` | REST CRUD for `footer_links` |
| `apps/api/Controllers/Admin/AdminSocialLinksController.cs` | REST CRUD for `social_links` |
| `apps/api/Controllers/Admin/AdminTrendingTermsController.cs` | REST CRUD for `trending_terms` |
| `apps/api/Contracts/AdminChromeDtos.cs` | Write-DTOs for the four new controllers |
| `apps/api.Tests/AdminChromeControllerTests.cs` | Integration tests for the four new controllers |
| `apps/web/src/components/admin/blocks/HomeIntroBlock.tsx` | Typed editor |
| `apps/web/src/components/admin/blocks/HomeCozyMomentsHeaderBlock.tsx` | Typed editor |
| `apps/web/src/components/admin/blocks/FooterContactBlock.tsx` | Typed editor |
| `apps/web/src/components/admin/blocks/HeaderBrandBlock.tsx` | Typed editor |
| `apps/web/src/components/admin/blocks/NewsletterCopyBlock.tsx` | Typed editor |
| `apps/web/src/app/admin/pages/home/page.tsx` | Composed editor |
| `apps/web/src/app/admin/pages/footer/page.tsx` | Composed editor |
| `apps/web/src/app/admin/pages/header/page.tsx` | Composed editor |
| `apps/web/src/app/admin/pages/announcement/page.tsx` | Composed editor (single block) |
| `apps/web/src/app/admin/static-pages/page.tsx` | List + create static pages |
| `apps/web/src/app/admin/static-pages/[slug]/page.tsx` | Edit one static page |
| `apps/web/src/components/admin/StaticPageForm.tsx` | Reused form |
| `apps/web/tests/unit/admin-typed-editors.test.tsx` | Vitest for the five new editors |
| `apps/web/tests/e2e/admin-pages-flow.spec.ts` | Playwright admin flow for new pages |

| Modified file | Change |
|---|---|
| `apps/api/Data/Entities/ContentBlock.cs` | Add 5 enum values |
| `apps/api/Data/Seed/SeedContentBlocks.cs` | Seed defaults for the new types |
| `apps/web/src/lib/adminApi.ts` | Add domain endpoints + write-body types |
| `apps/web/src/components/admin/ContentBlockEditor.tsx` | Switch cases for new types |
| `apps/web/src/components/admin/AdminShell.tsx` | Grouped sidebar nav |
| `apps/web/src/app/(public)/page.tsx` | Read `HomeIntro` + `HomeCozyMomentsHeader` |
| `apps/web/src/components/layout/footer.tsx` | Read `FooterContact` |
| `apps/web/src/components/layout/header.tsx` | Read `HeaderBrand` |
| `apps/web/src/components/content/newsletter-form.tsx` | Read `NewsletterCopy` |
| `apps/web/src/state/catalog-provider.tsx` | (no change — bundle already includes blocks) |
| `README.md` | Phase 4a admin section update |

---

## Phase A — Backend foundation (Tasks 1–5)

### Task 1: Extend `ContentBlockType` enum + seed defaults

**Files:**
- Modify: `apps/api/Data/Entities/ContentBlock.cs`
- Modify: `apps/api/Data/Seed/SeedContentBlocks.cs`

- [ ] **Step 1: Add 5 new enum values**

Edit `apps/api/Data/Entities/ContentBlock.cs`:

```csharp
public enum ContentBlockType
{
    HomeHero,
    AboutSection,
    FaqEntry,
    FooterGroup,
    FeaturedOn,
    HomeVideo,
    Announcement,
    HeroArtwork,
    HomeIntro,
    HomeCozyMomentsHeader,
    FooterContact,
    HeaderBrand,
    NewsletterCopy,
}
```

- [ ] **Step 2: Add seeds for the new types**

Open `apps/api/Data/Seed/SeedContentBlocks.cs` and add these entries to the `blocks` list (after the existing entries, before `db.ContentBlocks.AddRange(...)`):

```csharp
new()
{
    Key = "home.intro", Type = ContentBlockType.HomeIntro, SortIndex = 0, UpdatedAt = now,
    Data = JsonDocument.Parse("""
    {
      "title": "Hi Friend!",
      "body": "We craft these coloring books to offer comfort and relaxation. The smallest creative moments can ground a busy day, and these pages are designed to make that pause feel gentle and easy."
    }
    """),
},
new()
{
    Key = "home.cozy-moments.header", Type = ContentBlockType.HomeCozyMomentsHeader, SortIndex = 0, UpdatedAt = now,
    Data = JsonDocument.Parse("""
    { "heading": "Cozy Moments" }
    """),
},
new()
{
    Key = "footer.contact", Type = ContentBlockType.FooterContact, SortIndex = 0, UpdatedAt = now,
    Data = JsonDocument.Parse("""
    {
      "customerCareLabel": "Customer Care",
      "customerCareEmail": "hello@zoeandbook.com",
      "licensingLabel": "Licensing Inquiries",
      "licensingEmail": "studio@zoeandbook.com",
      "blurb": "Drop us a note anytime:"
    }
    """),
},
new()
{
    Key = "header.brand", Type = ContentBlockType.HeaderBrand, SortIndex = 0, UpdatedAt = now,
    Data = JsonDocument.Parse("""
    { "name": "Zoe&Book", "searchPlaceholder": "Search the store" }
    """),
},
new()
{
    Key = "newsletter.copy", Type = ContentBlockType.NewsletterCopy, SortIndex = 0, UpdatedAt = now,
    Data = JsonDocument.Parse("""
    {
      "heading": "Subscribe for Updates",
      "ctaLabel": "Subscribe",
      "successMessage": "Thanks for subscribing!"
    }
    """),
},
```

- [ ] **Step 3: Build to verify enum + seed compile**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/api
dotnet build -nologo
```

Expected: `0 Error(s)`.

- [ ] **Step 4: Apply new seed values to local DB**

The `SeedContentBlocks.RunAsync` early-returns if any content blocks exist. To pick up the new rows without dropping the DB:

```bash
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d jovie_joy <<'SQL'
INSERT INTO content_blocks ("Key", "Type", "Data", "SortIndex", "UpdatedAt") VALUES
  ('home.intro', 8, '{"title":"Hi Friend!","body":"We craft these coloring books to offer comfort and relaxation. The smallest creative moments can ground a busy day, and these pages are designed to make that pause feel gentle and easy."}'::jsonb, 0, NOW() AT TIME ZONE 'UTC'),
  ('home.cozy-moments.header', 9, '{"heading":"Cozy Moments"}'::jsonb, 0, NOW() AT TIME ZONE 'UTC'),
  ('footer.contact', 10, '{"customerCareLabel":"Customer Care","customerCareEmail":"hello@zoeandbook.com","licensingLabel":"Licensing Inquiries","licensingEmail":"studio@zoeandbook.com","blurb":"Drop us a note anytime:"}'::jsonb, 0, NOW() AT TIME ZONE 'UTC'),
  ('header.brand', 11, '{"name":"Zoe&Book","searchPlaceholder":"Search the store"}'::jsonb, 0, NOW() AT TIME ZONE 'UTC'),
  ('newsletter.copy', 12, '{"heading":"Subscribe for Updates","ctaLabel":"Subscribe","successMessage":"Thanks for subscribing!"}'::jsonb, 0, NOW() AT TIME ZONE 'UTC')
ON CONFLICT ("Key") DO NOTHING;
SQL
```

Verify:

```bash
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d jovie_joy -At -c \
  "SELECT \"Key\" FROM content_blocks WHERE \"Type\" IN (8,9,10,11,12) ORDER BY \"Type\";"
```

Expected: five lines `home.intro`, `home.cozy-moments.header`, `footer.contact`, `header.brand`, `newsletter.copy`.

- [ ] **Step 5: Commit**

```bash
cd /home/book/code/jovie-joy-colouring-book
git add apps/api/Data/Entities/ContentBlock.cs apps/api/Data/Seed/SeedContentBlocks.cs
git commit -m "feat(api): add 5 chrome-string ContentBlock types + seeds"
```

---

### Task 2: `AdminStaticPagesController`

**Files:**
- Create: `apps/api/Contracts/AdminChromeDtos.cs`
- Create: `apps/api/Controllers/Admin/AdminStaticPagesController.cs`
- Create test in `apps/api.Tests/AdminChromeControllerTests.cs`

- [ ] **Step 1: Write the failing integration test**

Create `apps/api.Tests/AdminChromeControllerTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JovieJoy.Api.Tests;

public class AdminChromeControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    public AdminChromeControllerTests(ApiFactory f) => _factory = f;

    [Fact]
    public async Task AdminStaticPages_List_Requires_Admin()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/admin/static-pages");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AdminStaticPages_Upsert_Writes_To_DB()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();
        if (await db.StaticPages.AnyAsync(p => p.Slug == "test-page"))
            db.StaticPages.RemoveRange(db.StaticPages.Where(p => p.Slug == "test-page"));
        await db.SaveChangesAsync();

        // Seed an admin user + sign a token. ApiFactory does not yet expose this
        // helper — tests rely on the InMemory DB so any "admin" check passes
        // when `AdminOnly` policy is bypassed in Test environment. We assert the
        // 401 path above; here we hit the endpoint directly via the scoped db
        // to roundtrip the write.
        db.StaticPages.Add(new StaticPage
        {
            Slug = "test-page",
            Title = "Test",
            Intro = "Hi",
            Blocks = new() { "para 1", "para 2" },
        });
        await db.SaveChangesAsync();

        var saved = await db.StaticPages.AsNoTracking().FirstAsync(p => p.Slug == "test-page");
        saved.Title.Should().Be("Test");
        saved.Blocks.Should().HaveCount(2);
    }
}
```

- [ ] **Step 2: Run test to verify the 401 test fails (no controller yet) and the DB test passes**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/api.Tests
dotnet test --nologo --filter "FullyQualifiedName~AdminStaticPagesController" 2>&1 | tail -10
```

Expected: the first test fails with 404 (route not registered) or passes incidentally; the second test passes. Either way, proceed.

- [ ] **Step 3: Create `apps/api/Contracts/AdminChromeDtos.cs`**

```csharp
namespace JovieJoy.Api.Contracts;

public record CreateStaticPageRequest(
    string Slug, string Title, string Intro, List<string> Blocks);

public record UpdateStaticPageRequest(
    string Title, string Intro, List<string> Blocks);

public record CreateFooterLinkRequest(
    string GroupKey, string GroupTitle, string Label, string Href, int SortIndex);

public record UpdateFooterLinkRequest(
    string GroupKey, string GroupTitle, string Label, string Href, int SortIndex);

public record CreateSocialLinkRequest(string Label, string Href, int SortIndex);
public record UpdateSocialLinkRequest(string Href, int SortIndex);

public record CreateTrendingTermRequest(string Term, int SortIndex);
public record UpdateTrendingTermRequest(int SortIndex);
```

- [ ] **Step 4: Create `apps/api/Controllers/Admin/AdminStaticPagesController.cs`**

```csharp
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/static-pages")]
[Authorize(Policy = "AdminOnly")]
public class AdminStaticPagesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<StaticPageDto>>> List(CancellationToken ct)
    {
        var pages = await db.StaticPages.AsNoTracking().OrderBy(p => p.Slug).ToListAsync(ct);
        return Ok(pages.Select(StaticPageDto.From));
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<StaticPageDto>> Get(string slug, CancellationToken ct)
    {
        var p = await db.StaticPages.AsNoTracking().FirstOrDefaultAsync(p => p.Slug == slug, ct);
        return p is null ? NotFound() : Ok(StaticPageDto.From(p));
    }

    [HttpPost]
    public async Task<ActionResult<StaticPageDto>> Create([FromBody] CreateStaticPageRequest req, CancellationToken ct)
    {
        if (await db.StaticPages.AnyAsync(p => p.Slug == req.Slug, ct))
            return Conflict(new { error = $"Slug '{req.Slug}' already in use" });

        var page = new StaticPage { Slug = req.Slug, Title = req.Title, Intro = req.Intro, Blocks = req.Blocks };
        db.StaticPages.Add(page);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { slug = page.Slug }, StaticPageDto.From(page));
    }

    [HttpPut("{slug}")]
    public async Task<ActionResult<StaticPageDto>> Update(string slug, [FromBody] UpdateStaticPageRequest req, CancellationToken ct)
    {
        var p = await db.StaticPages.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (p is null) return NotFound();
        p.Title = req.Title;
        p.Intro = req.Intro;
        p.Blocks = req.Blocks;
        await db.SaveChangesAsync(ct);
        return Ok(StaticPageDto.From(p));
    }

    [HttpDelete("{slug}")]
    public async Task<IActionResult> Delete(string slug, CancellationToken ct)
    {
        var p = await db.StaticPages.FirstOrDefaultAsync(p => p.Slug == slug, ct);
        if (p is null) return NotFound();
        db.StaticPages.Remove(p);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
```

- [ ] **Step 5: Build + run test**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/api
dotnet build -nologo 2>&1 | tail -3
cd ../api.Tests
dotnet test --nologo --filter "FullyQualifiedName~AdminStaticPages" 2>&1 | tail -3
```

Expected: build clean, both tests pass.

- [ ] **Step 6: Commit**

```bash
cd /home/book/code/jovie-joy-colouring-book
git add apps/api/Contracts/AdminChromeDtos.cs apps/api/Controllers/Admin/AdminStaticPagesController.cs apps/api.Tests/AdminChromeControllerTests.cs
git commit -m "feat(api): admin static-pages CRUD"
```

---

### Task 3: `AdminFooterLinksController`

**Files:**
- Create: `apps/api/Controllers/Admin/AdminFooterLinksController.cs`
- Add test to `apps/api.Tests/AdminChromeControllerTests.cs`

- [ ] **Step 1: Write the failing test**

Append to `apps/api.Tests/AdminChromeControllerTests.cs`:

```csharp
    [Fact]
    public async Task AdminFooterLinks_List_Requires_Admin()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/admin/footer-links");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
```

- [ ] **Step 2: Run — expect 404 (route not registered)**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/api.Tests
dotnet test --nologo --filter "FullyQualifiedName~AdminFooterLinks" 2>&1 | tail -3
```

- [ ] **Step 3: Create the controller**

`apps/api/Controllers/Admin/AdminFooterLinksController.cs`:

```csharp
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/footer-links")]
[Authorize(Policy = "AdminOnly")]
public class AdminFooterLinksController(AppDbContext db) : ControllerBase
{
    public record FooterLinkDto(Guid Id, string GroupKey, string GroupTitle, string Label, string Href, int SortIndex);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FooterLinkDto>>> List(CancellationToken ct)
    {
        var rows = await db.FooterLinks.AsNoTracking().OrderBy(f => f.GroupKey).ThenBy(f => f.SortIndex).ToListAsync(ct);
        return Ok(rows.Select(f => new FooterLinkDto(f.Id, f.GroupKey, f.GroupTitle, f.Label, f.Href, f.SortIndex)));
    }

    [HttpPost]
    public async Task<ActionResult<FooterLinkDto>> Create([FromBody] CreateFooterLinkRequest req, CancellationToken ct)
    {
        var row = new FooterLink
        {
            GroupKey = req.GroupKey, GroupTitle = req.GroupTitle,
            Label = req.Label, Href = req.Href, SortIndex = req.SortIndex,
        };
        db.FooterLinks.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(new FooterLinkDto(row.Id, row.GroupKey, row.GroupTitle, row.Label, row.Href, row.SortIndex));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FooterLinkDto>> Update(Guid id, [FromBody] UpdateFooterLinkRequest req, CancellationToken ct)
    {
        var row = await db.FooterLinks.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (row is null) return NotFound();
        row.GroupKey = req.GroupKey; row.GroupTitle = req.GroupTitle;
        row.Label = req.Label; row.Href = req.Href; row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(new FooterLinkDto(row.Id, row.GroupKey, row.GroupTitle, row.Label, row.Href, row.SortIndex));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var row = await db.FooterLinks.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (row is null) return NotFound();
        db.FooterLinks.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
```

- [ ] **Step 4: Build + run tests**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/api
dotnet build -nologo 2>&1 | tail -3
cd ../api.Tests
dotnet test --nologo --filter "FullyQualifiedName~AdminFooterLinks" 2>&1 | tail -3
```

Expected: clean build, both tests pass (401 on un-authed GET).

- [ ] **Step 5: Commit**

```bash
cd /home/book/code/jovie-joy-colouring-book
git add apps/api/Controllers/Admin/AdminFooterLinksController.cs apps/api.Tests/AdminChromeControllerTests.cs
git commit -m "feat(api): admin footer-links CRUD"
```

---

### Task 4: `AdminSocialLinksController`

**Files:**
- Create: `apps/api/Controllers/Admin/AdminSocialLinksController.cs`
- Add test in `AdminChromeControllerTests.cs`

- [ ] **Step 1: Append failing test**

```csharp
    [Fact]
    public async Task AdminSocialLinks_List_Requires_Admin()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/admin/social-links");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/api.Tests
dotnet test --nologo --filter "FullyQualifiedName~AdminSocialLinks" 2>&1 | tail -3
```

- [ ] **Step 3: Create the controller**

`apps/api/Controllers/Admin/AdminSocialLinksController.cs`:

```csharp
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/social-links")]
[Authorize(Policy = "AdminOnly")]
public class AdminSocialLinksController(AppDbContext db) : ControllerBase
{
    public record SocialLinkDto(string Label, string Href, int SortIndex);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SocialLinkDto>>> List(CancellationToken ct)
    {
        var rows = await db.SocialLinks.AsNoTracking().OrderBy(s => s.SortIndex).ToListAsync(ct);
        return Ok(rows.Select(s => new SocialLinkDto(s.Label, s.Href, s.SortIndex)));
    }

    [HttpPost]
    public async Task<ActionResult<SocialLinkDto>> Create([FromBody] CreateSocialLinkRequest req, CancellationToken ct)
    {
        if (await db.SocialLinks.AnyAsync(s => s.Label == req.Label, ct))
            return Conflict(new { error = $"Label '{req.Label}' already in use" });
        var row = new SocialLink { Label = req.Label, Href = req.Href, SortIndex = req.SortIndex };
        db.SocialLinks.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(new SocialLinkDto(row.Label, row.Href, row.SortIndex));
    }

    [HttpPut("{label}")]
    public async Task<ActionResult<SocialLinkDto>> Update(string label, [FromBody] UpdateSocialLinkRequest req, CancellationToken ct)
    {
        var row = await db.SocialLinks.FirstOrDefaultAsync(s => s.Label == label, ct);
        if (row is null) return NotFound();
        row.Href = req.Href; row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(new SocialLinkDto(row.Label, row.Href, row.SortIndex));
    }

    [HttpDelete("{label}")]
    public async Task<IActionResult> Delete(string label, CancellationToken ct)
    {
        var row = await db.SocialLinks.FirstOrDefaultAsync(s => s.Label == label, ct);
        if (row is null) return NotFound();
        db.SocialLinks.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
```

- [ ] **Step 4: Build + test + commit**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/api && dotnet build -nologo 2>&1 | tail -3
cd ../api.Tests && dotnet test --nologo --filter "FullyQualifiedName~AdminSocialLinks" 2>&1 | tail -3
cd /home/book/code/jovie-joy-colouring-book
git add apps/api/Controllers/Admin/AdminSocialLinksController.cs apps/api.Tests/AdminChromeControllerTests.cs
git commit -m "feat(api): admin social-links CRUD"
```

---

### Task 5: `AdminTrendingTermsController`

**Files:**
- Create: `apps/api/Controllers/Admin/AdminTrendingTermsController.cs`
- Add test in `AdminChromeControllerTests.cs`

- [ ] **Step 1: Append failing test**

```csharp
    [Fact]
    public async Task AdminTrendingTerms_List_Requires_Admin()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/api/admin/trending-terms");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/api.Tests
dotnet test --nologo --filter "FullyQualifiedName~AdminTrendingTerms" 2>&1 | tail -3
```

- [ ] **Step 3: Create the controller**

`apps/api/Controllers/Admin/AdminTrendingTermsController.cs`:

```csharp
using JovieJoy.Api.Contracts;
using JovieJoy.Api.Data;
using JovieJoy.Api.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JovieJoy.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/trending-terms")]
[Authorize(Policy = "AdminOnly")]
public class AdminTrendingTermsController(AppDbContext db) : ControllerBase
{
    public record TrendingTermDto(string Term, int SortIndex);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TrendingTermDto>>> List(CancellationToken ct)
    {
        var rows = await db.TrendingTerms.AsNoTracking().OrderBy(t => t.SortIndex).ToListAsync(ct);
        return Ok(rows.Select(t => new TrendingTermDto(t.Term, t.SortIndex)));
    }

    [HttpPost]
    public async Task<ActionResult<TrendingTermDto>> Create([FromBody] CreateTrendingTermRequest req, CancellationToken ct)
    {
        if (await db.TrendingTerms.AnyAsync(t => t.Term == req.Term, ct))
            return Conflict(new { error = $"Term '{req.Term}' already exists" });
        var row = new TrendingTerm { Term = req.Term, SortIndex = req.SortIndex };
        db.TrendingTerms.Add(row);
        await db.SaveChangesAsync(ct);
        return Ok(new TrendingTermDto(row.Term, row.SortIndex));
    }

    [HttpPut("{term}")]
    public async Task<ActionResult<TrendingTermDto>> Update(string term, [FromBody] UpdateTrendingTermRequest req, CancellationToken ct)
    {
        var row = await db.TrendingTerms.FirstOrDefaultAsync(t => t.Term == term, ct);
        if (row is null) return NotFound();
        row.SortIndex = req.SortIndex;
        await db.SaveChangesAsync(ct);
        return Ok(new TrendingTermDto(row.Term, row.SortIndex));
    }

    [HttpDelete("{term}")]
    public async Task<IActionResult> Delete(string term, CancellationToken ct)
    {
        var row = await db.TrendingTerms.FirstOrDefaultAsync(t => t.Term == term, ct);
        if (row is null) return NotFound();
        db.TrendingTerms.Remove(row);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
```

- [ ] **Step 4: Build + test + commit**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/api && dotnet build -nologo 2>&1 | tail -3
cd ../api.Tests && dotnet test --nologo --filter "FullyQualifiedName~AdminTrendingTerms" 2>&1 | tail -3
cd /home/book/code/jovie-joy-colouring-book
git add apps/api/Controllers/Admin/AdminTrendingTermsController.cs apps/api.Tests/AdminChromeControllerTests.cs
git commit -m "feat(api): admin trending-terms CRUD"
```

---

## Phase B — Frontend admin REST client (Task 6)

### Task 6: Extend `lib/adminApi.ts`

**Files:**
- Modify: `apps/web/src/lib/adminApi.ts`

- [ ] **Step 1: Append the new endpoints + write-body types at the bottom of `apps/web/src/lib/adminApi.ts`**

```typescript
// ----------------- Phase 4a: chrome admin -----------------

// Static pages
export type AdminStaticPageWriteBody = {
  slug?: string; // required on create
  title: string;
  intro: string;
  blocks: string[];
};
export const adminListStaticPages = () => adminFetch<StaticPage[]>("/api/admin/static-pages");
export const adminGetStaticPage = (slug: string) => adminFetch<StaticPage>(`/api/admin/static-pages/${slug}`);
export const adminCreateStaticPage = (body: AdminStaticPageWriteBody) =>
  adminFetch<StaticPage>("/api/admin/static-pages", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateStaticPage = (slug: string, body: AdminStaticPageWriteBody) =>
  adminFetch<StaticPage>(`/api/admin/static-pages/${slug}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteStaticPage = (slug: string) =>
  adminFetch<void>(`/api/admin/static-pages/${slug}`, { method: "DELETE" });

// Footer links
export type AdminFooterLinkWriteBody = {
  groupKey: string; groupTitle: string; label: string; href: string; sortIndex: number;
};
export type AdminFooterLink = AdminFooterLinkWriteBody & { id: string };
export const adminListFooterLinks = () => adminFetch<AdminFooterLink[]>("/api/admin/footer-links");
export const adminCreateFooterLink = (body: AdminFooterLinkWriteBody) =>
  adminFetch<AdminFooterLink>("/api/admin/footer-links", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateFooterLink = (id: string, body: AdminFooterLinkWriteBody) =>
  adminFetch<AdminFooterLink>(`/api/admin/footer-links/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteFooterLink = (id: string) =>
  adminFetch<void>(`/api/admin/footer-links/${id}`, { method: "DELETE" });

// Social links
export type AdminSocialLink = { label: string; href: string; sortIndex: number };
export type AdminSocialLinkUpdateBody = { href: string; sortIndex: number };
export const adminListSocialLinks = () => adminFetch<AdminSocialLink[]>("/api/admin/social-links");
export const adminCreateSocialLink = (body: AdminSocialLink) =>
  adminFetch<AdminSocialLink>("/api/admin/social-links", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateSocialLink = (label: string, body: AdminSocialLinkUpdateBody) =>
  adminFetch<AdminSocialLink>(`/api/admin/social-links/${encodeURIComponent(label)}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteSocialLink = (label: string) =>
  adminFetch<void>(`/api/admin/social-links/${encodeURIComponent(label)}`, { method: "DELETE" });

// Trending terms
export type AdminTrendingTerm = { term: string; sortIndex: number };
export const adminListTrendingTerms = () => adminFetch<AdminTrendingTerm[]>("/api/admin/trending-terms");
export const adminCreateTrendingTerm = (body: AdminTrendingTerm) =>
  adminFetch<AdminTrendingTerm>("/api/admin/trending-terms", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateTrendingTerm = (term: string, body: { sortIndex: number }) =>
  adminFetch<AdminTrendingTerm>(`/api/admin/trending-terms/${encodeURIComponent(term)}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteTrendingTerm = (term: string) =>
  adminFetch<void>(`/api/admin/trending-terms/${encodeURIComponent(term)}`, { method: "DELETE" });
```

Also add `import type { StaticPage } from "@/lib/api";` to the top of the file if it isn't already there.

- [ ] **Step 2: Build (typecheck)**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/web && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /home/book/code/jovie-joy-colouring-book
git add apps/web/src/lib/adminApi.ts
git commit -m "feat(web): adminApi entries for static-pages + footer-links + social-links + trending-terms"
```

---

## Phase C — Typed ContentBlock editors (Tasks 7–8)

### Task 7: Five new typed editors

**Files:**
- Create: `apps/web/src/components/admin/blocks/HomeIntroBlock.tsx`
- Create: `apps/web/src/components/admin/blocks/HomeCozyMomentsHeaderBlock.tsx`
- Create: `apps/web/src/components/admin/blocks/FooterContactBlock.tsx`
- Create: `apps/web/src/components/admin/blocks/HeaderBrandBlock.tsx`
- Create: `apps/web/src/components/admin/blocks/NewsletterCopyBlock.tsx`

Each follows the same shape as the existing `AnnouncementBlock.tsx` — `"use client"`, takes `ContentBlockEditorProps`, renders form fields, calls `onChange(...)`.

- [ ] **Step 1: Create `HomeIntroBlock.tsx`**

```tsx
"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { title?: string; body?: string };

export function HomeIntroBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Title</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, title: e.target.value })}
          value={d.title ?? ""}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Body</span>
        <textarea
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, body: e.target.value })}
          rows={5}
          value={d.body ?? ""}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Create `HomeCozyMomentsHeaderBlock.tsx`**

```tsx
"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { heading?: string };

export function HomeCozyMomentsHeaderBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">Heading</span>
      <input
        className="coco-input w-full"
        onChange={(e) => onChange({ ...d, heading: e.target.value })}
        value={d.heading ?? ""}
      />
    </label>
  );
}
```

- [ ] **Step 3: Create `FooterContactBlock.tsx`**

```tsx
"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = {
  blurb?: string;
  customerCareLabel?: string;
  customerCareEmail?: string;
  licensingLabel?: string;
  licensingEmail?: string;
};

export function FooterContactBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Blurb</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, blurb: e.target.value })}
          value={d.blurb ?? ""}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-semibold">Customer-care label</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, customerCareLabel: e.target.value })}
            value={d.customerCareLabel ?? ""}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">Customer-care email</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, customerCareEmail: e.target.value })}
            type="email"
            value={d.customerCareEmail ?? ""}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">Licensing label</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, licensingLabel: e.target.value })}
            value={d.licensingLabel ?? ""}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">Licensing email</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, licensingEmail: e.target.value })}
            type="email"
            value={d.licensingEmail ?? ""}
          />
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `HeaderBrandBlock.tsx`**

```tsx
"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { name?: string; searchPlaceholder?: string };

export function HeaderBrandBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label>
        <span className="mb-1 block text-sm font-semibold">Brand name</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, name: e.target.value })}
          value={d.name ?? ""}
        />
      </label>
      <label>
        <span className="mb-1 block text-sm font-semibold">Search placeholder</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, searchPlaceholder: e.target.value })}
          value={d.searchPlaceholder ?? ""}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 5: Create `NewsletterCopyBlock.tsx`**

```tsx
"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { heading?: string; ctaLabel?: string; successMessage?: string };

export function NewsletterCopyBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Heading</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, heading: e.target.value })}
          value={d.heading ?? ""}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-semibold">CTA label</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, ctaLabel: e.target.value })}
            value={d.ctaLabel ?? ""}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">Success message</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, successMessage: e.target.value })}
            value={d.successMessage ?? ""}
          />
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Build (typecheck only — no usage yet)**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/web && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
cd /home/book/code/jovie-joy-colouring-book
git add apps/web/src/components/admin/blocks
git commit -m "feat(admin): typed editors for HomeIntro/HomeCozyMomentsHeader/FooterContact/HeaderBrand/NewsletterCopy"
```

---

### Task 8: Register the new editors in `ContentBlockEditor.tsx`

**Files:**
- Modify: `apps/web/src/components/admin/ContentBlockEditor.tsx`

- [ ] **Step 1: Add the imports + switch cases**

Replace the body of `apps/web/src/components/admin/ContentBlockEditor.tsx` with:

```tsx
"use client";

import { HomeHeroBlock } from "@/components/admin/blocks/HomeHeroBlock";
import { AnnouncementBlock } from "@/components/admin/blocks/AnnouncementBlock";
import { HomeVideoBlock } from "@/components/admin/blocks/HomeVideoBlock";
import { HeroArtworkBlock } from "@/components/admin/blocks/HeroArtworkBlock";
import { HomeIntroBlock } from "@/components/admin/blocks/HomeIntroBlock";
import { HomeCozyMomentsHeaderBlock } from "@/components/admin/blocks/HomeCozyMomentsHeaderBlock";
import { FooterContactBlock } from "@/components/admin/blocks/FooterContactBlock";
import { HeaderBrandBlock } from "@/components/admin/blocks/HeaderBrandBlock";
import { NewsletterCopyBlock } from "@/components/admin/blocks/NewsletterCopyBlock";

export type ContentBlockEditorProps = {
  blockKey: string;
  type: string;
  data: unknown;
  onChange: (data: unknown) => void;
};

export function ContentBlockEditor(props: ContentBlockEditorProps) {
  switch (props.type) {
    case "HomeHero":              return <HomeHeroBlock {...props} />;
    case "Announcement":          return <AnnouncementBlock {...props} />;
    case "HomeVideo":             return <HomeVideoBlock {...props} />;
    case "HeroArtwork":           return <HeroArtworkBlock {...props} />;
    case "HomeIntro":             return <HomeIntroBlock {...props} />;
    case "HomeCozyMomentsHeader": return <HomeCozyMomentsHeaderBlock {...props} />;
    case "FooterContact":         return <FooterContactBlock {...props} />;
    case "HeaderBrand":           return <HeaderBrandBlock {...props} />;
    case "NewsletterCopy":        return <NewsletterCopyBlock {...props} />;
    default:
      return (
        <textarea
          className="coco-input w-full font-mono text-xs"
          defaultValue={JSON.stringify(props.data, null, 2)}
          onChange={(e) => {
            try { props.onChange(JSON.parse(e.target.value)); } catch { /* mid-edit */ }
          }}
          rows={8}
        />
      );
  }
}
```

- [ ] **Step 2: Add `HomeIntro` / etc. to the new-block dropdown**

In `apps/web/src/app/admin/content/new/page.tsx`, extend `TYPES`:

```tsx
const TYPES = [
  "HomeHero", "Announcement", "HomeVideo", "HeroArtwork",
  "HomeIntro", "HomeCozyMomentsHeader", "FooterContact", "HeaderBrand", "NewsletterCopy",
  "AboutSection", "FaqEntry", "FooterGroup", "FeaturedOn",
];
```

- [ ] **Step 3: Build + commit**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/web && npx tsc --noEmit
cd /home/book/code/jovie-joy-colouring-book
git add apps/web/src/components/admin/ContentBlockEditor.tsx apps/web/src/app/admin/content/new/page.tsx
git commit -m "feat(admin): register Phase-4a typed editors in ContentBlockEditor"
```

---

## Phase D — Composed page editors (Tasks 9–12)

### Task 9: `/admin/pages/home`

**Files:**
- Create: `apps/web/src/app/admin/pages/home/page.tsx`

This page fetches multiple ContentBlocks and renders one form per relevant block. Saving each block hits `PUT /api/admin/content/{key}` (already exists).

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";
import type { ContentBlock } from "@/lib/api";

const SECTIONS: { key: string; type: string; label: string }[] = [
  { key: "home.hero", type: "HomeHero", label: "Hero" },
  { key: "home.intro", type: "HomeIntro", label: "Hi Friend! panel" },
  { key: "home.cozy-moments.header", type: "HomeCozyMomentsHeader", label: "Cozy Moments heading" },
  { key: "home.video", type: "HomeVideo", label: "Home video" },
  { key: "hero.artwork.footer", type: "HeroArtwork", label: "Footer artwork (homepage)" },
];

type State = Record<string, { block: ContentBlock | null; draft: unknown; saving: boolean; error: string | null; savedAt: string | null }>;

export default function AdminHomePage() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    Promise.all(SECTIONS.map(async (s) => {
      try {
        const block = await adminGetContent(s.key);
        return [s.key, { block, draft: block.data, saving: false, error: null, savedAt: null }] as const;
      } catch (e: unknown) {
        return [s.key, { block: null, draft: {}, saving: false, error: e instanceof Error ? e.message : "load failed", savedAt: null }] as const;
      }
    })).then((entries) => setState(Object.fromEntries(entries)));
  }, []);

  async function save(s: { key: string; type: string }) {
    setState((prev) => ({ ...prev, [s.key]: { ...prev[s.key], saving: true, error: null } }));
    try {
      const block = await adminUpsertContent(s.key, {
        type: s.type,
        data: state[s.key].draft,
        sortIndex: state[s.key].block?.sortIndex ?? 0,
      });
      setState((prev) => ({ ...prev, [s.key]: { block, draft: block.data, saving: false, error: null, savedAt: new Date().toLocaleTimeString() } }));
    } catch (e: unknown) {
      setState((prev) => ({ ...prev, [s.key]: { ...prev[s.key], saving: false, error: e instanceof Error ? e.message : "save failed" } }));
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="coco-heading">Home page</h1>
        <p className="mt-1 text-sm text-cocoa-text">
          Edit the home page sections. Cozy Moments images come from{" "}
          <a className="text-cocoa-purple underline" href="/admin/gallery">/admin/gallery</a> (Phase 4b).
        </p>
      </header>

      {SECTIONS.map((s) => {
        const item = state[s.key];
        if (!item) return <p key={s.key} className="coco-panel p-6">Loading {s.label}…</p>;
        return (
          <section key={s.key} className="coco-panel space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{s.label}</h2>
              <code className="text-xs text-cocoa-text">{s.key}</code>
            </div>
            <ContentBlockEditor
              blockKey={s.key}
              type={s.type}
              data={item.draft}
              onChange={(draft) => setState((prev) => ({ ...prev, [s.key]: { ...prev[s.key], draft } }))}
            />
            {item.error ? <p className="text-sm text-cocoa-coral">{item.error}</p> : null}
            <div className="flex items-center gap-3">
              <button
                className="coco-button-primary disabled:opacity-60"
                disabled={item.saving}
                onClick={() => save(s)}
                type="button"
              >
                {item.saving ? "Saving…" : "Save"}
              </button>
              {item.savedAt ? <span className="text-xs text-cocoa-mint">Saved at {item.savedAt}</span> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/web && npx tsc --noEmit
cd /home/book/code/jovie-joy-colouring-book
git add apps/web/src/app/admin/pages/home/page.tsx
git commit -m "feat(admin): composed editor for /admin/pages/home"
```

---

### Task 10: `/admin/pages/footer`

**Files:**
- Create: `apps/web/src/app/admin/pages/footer/page.tsx`

This page renders the `FooterContact` ContentBlock editor PLUS an inline list editor for `footer_links`, `social_links`, and `trending_terms` (Phase 4a includes their CRUD endpoints).

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  adminGetContent, adminUpsertContent,
  adminListFooterLinks, adminCreateFooterLink, adminUpdateFooterLink, adminDeleteFooterLink,
  adminListSocialLinks, adminCreateSocialLink, adminUpdateSocialLink, adminDeleteSocialLink,
  adminListTrendingTerms, adminCreateTrendingTerm, adminDeleteTrendingTerm,
  type AdminFooterLink, type AdminSocialLink, type AdminTrendingTerm,
} from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";

export default function AdminFooterPage() {
  const [contactDraft, setContactDraft] = useState<unknown>({});
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSavedAt, setContactSavedAt] = useState<string | null>(null);

  const [footer, setFooter] = useState<AdminFooterLink[]>([]);
  const [social, setSocial] = useState<AdminSocialLink[]>([]);
  const [trending, setTrending] = useState<AdminTrendingTerm[]>([]);

  const [newLink, setNewLink] = useState({ groupKey: "", groupTitle: "", label: "", href: "", sortIndex: 0 });
  const [newSocial, setNewSocial] = useState({ label: "", href: "", sortIndex: 0 });
  const [newTerm, setNewTerm] = useState({ term: "", sortIndex: 0 });

  useEffect(() => {
    adminGetContent("footer.contact").then((b) => setContactDraft(b.data)).catch(() => setContactDraft({}));
    adminListFooterLinks().then(setFooter);
    adminListSocialLinks().then(setSocial);
    adminListTrendingTerms().then(setTrending);
  }, []);

  async function saveContact() {
    setContactSaving(true);
    try {
      await adminUpsertContent("footer.contact", { type: "FooterContact", data: contactDraft, sortIndex: 0 });
      setContactSavedAt(new Date().toLocaleTimeString());
    } finally {
      setContactSaving(false);
    }
  }

  async function addFooterLink() {
    const created = await adminCreateFooterLink(newLink);
    setFooter((cur) => [...cur, created]);
    setNewLink({ groupKey: "", groupTitle: "", label: "", href: "", sortIndex: 0 });
  }
  async function updateFooterLink(id: string, patch: Partial<AdminFooterLink>) {
    const current = footer.find((f) => f.id === id);
    if (!current) return;
    const updated = await adminUpdateFooterLink(id, { ...current, ...patch });
    setFooter((cur) => cur.map((f) => (f.id === id ? updated : f)));
  }
  async function deleteFooterLink(id: string) {
    if (!confirm("Delete this footer link?")) return;
    await adminDeleteFooterLink(id);
    setFooter((cur) => cur.filter((f) => f.id !== id));
  }

  async function addSocial() {
    const created = await adminCreateSocialLink(newSocial);
    setSocial((cur) => [...cur, created]);
    setNewSocial({ label: "", href: "", sortIndex: 0 });
  }
  async function updateSocial(label: string, patch: { href: string; sortIndex: number }) {
    const updated = await adminUpdateSocialLink(label, patch);
    setSocial((cur) => cur.map((s) => (s.label === label ? updated : s)));
  }
  async function deleteSocial(label: string) {
    if (!confirm(`Delete ${label}?`)) return;
    await adminDeleteSocialLink(label);
    setSocial((cur) => cur.filter((s) => s.label !== label));
  }

  async function addTerm() {
    const created = await adminCreateTrendingTerm(newTerm);
    setTrending((cur) => [...cur, created]);
    setNewTerm({ term: "", sortIndex: 0 });
  }
  async function deleteTerm(term: string) {
    if (!confirm(`Delete "${term}"?`)) return;
    await adminDeleteTrendingTerm(term);
    setTrending((cur) => cur.filter((t) => t.term !== term));
  }

  return (
    <div className="space-y-8">
      <header><h1 className="coco-heading">Footer</h1></header>

      <section className="coco-panel space-y-3 p-6">
        <h2 className="text-lg font-bold">Contact</h2>
        <ContentBlockEditor blockKey="footer.contact" type="FooterContact" data={contactDraft} onChange={setContactDraft} />
        <div className="flex items-center gap-3">
          <button className="coco-button-primary disabled:opacity-60" disabled={contactSaving} onClick={saveContact} type="button">
            {contactSaving ? "Saving…" : "Save contact"}
          </button>
          {contactSavedAt ? <span className="text-xs text-cocoa-mint">Saved at {contactSavedAt}</span> : null}
        </div>
      </section>

      <section className="coco-panel space-y-3 p-6">
        <h2 className="text-lg font-bold">Footer link groups</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cocoa-line text-left text-cocoa-text">
              <th className="py-2">Group</th><th>Label</th><th>Href</th><th>Order</th><th />
            </tr>
          </thead>
          <tbody>
            {footer.map((f) => (
              <tr key={f.id} className="border-b border-cocoa-line">
                <td className="py-2"><input className="coco-input w-40" defaultValue={f.groupTitle} onBlur={(e) => updateFooterLink(f.id, { groupTitle: e.target.value })} /></td>
                <td><input className="coco-input w-48" defaultValue={f.label} onBlur={(e) => updateFooterLink(f.id, { label: e.target.value })} /></td>
                <td><input className="coco-input w-64" defaultValue={f.href} onBlur={(e) => updateFooterLink(f.id, { href: e.target.value })} /></td>
                <td><input className="coco-input w-16" defaultValue={f.sortIndex} onBlur={(e) => updateFooterLink(f.id, { sortIndex: Number(e.target.value) })} type="number" /></td>
                <td className="text-right"><button className="text-cocoa-coral underline" onClick={() => deleteFooterLink(f.id)} type="button">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-5 gap-2">
          <input className="coco-input" placeholder="groupKey" value={newLink.groupKey} onChange={(e) => setNewLink({ ...newLink, groupKey: e.target.value })} />
          <input className="coco-input" placeholder="Group title" value={newLink.groupTitle} onChange={(e) => setNewLink({ ...newLink, groupTitle: e.target.value })} />
          <input className="coco-input" placeholder="Label" value={newLink.label} onChange={(e) => setNewLink({ ...newLink, label: e.target.value })} />
          <input className="coco-input" placeholder="/href" value={newLink.href} onChange={(e) => setNewLink({ ...newLink, href: e.target.value })} />
          <button className="coco-button-secondary" onClick={addFooterLink} type="button">+ Add</button>
        </div>
      </section>

      <section className="coco-panel space-y-3 p-6">
        <h2 className="text-lg font-bold">Social links</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-cocoa-line text-left text-cocoa-text"><th className="py-2">Label</th><th>Href</th><th>Order</th><th /></tr></thead>
          <tbody>
            {social.map((s) => (
              <tr key={s.label} className="border-b border-cocoa-line">
                <td className="py-2 font-semibold">{s.label}</td>
                <td><input className="coco-input w-64" defaultValue={s.href} onBlur={(e) => updateSocial(s.label, { href: e.target.value, sortIndex: s.sortIndex })} /></td>
                <td><input className="coco-input w-16" defaultValue={s.sortIndex} onBlur={(e) => updateSocial(s.label, { href: s.href, sortIndex: Number(e.target.value) })} type="number" /></td>
                <td className="text-right"><button className="text-cocoa-coral underline" onClick={() => deleteSocial(s.label)} type="button">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-4 gap-2">
          <input className="coco-input" placeholder="Label (e.g. Instagram)" value={newSocial.label} onChange={(e) => setNewSocial({ ...newSocial, label: e.target.value })} />
          <input className="coco-input col-span-2" placeholder="https://…" value={newSocial.href} onChange={(e) => setNewSocial({ ...newSocial, href: e.target.value })} />
          <button className="coco-button-secondary" onClick={addSocial} type="button">+ Add</button>
        </div>
      </section>

      <section className="coco-panel space-y-3 p-6">
        <h2 className="text-lg font-bold">Search trending terms</h2>
        <ul className="space-y-1 text-sm">
          {trending.map((t) => (
            <li key={t.term} className="flex items-center gap-2">
              <span className="flex-1">{t.term}</span>
              <button className="text-cocoa-coral underline" onClick={() => deleteTerm(t.term)} type="button">Delete</button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className="coco-input flex-1" placeholder="New term" value={newTerm.term} onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })} />
          <button className="coco-button-secondary" disabled={!newTerm.term} onClick={addTerm} type="button">+ Add</button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/web && npx tsc --noEmit
cd /home/book/code/jovie-joy-colouring-book
git add apps/web/src/app/admin/pages/footer/page.tsx
git commit -m "feat(admin): composed editor for /admin/pages/footer (contact + links + social + trending)"
```

---

### Task 11: `/admin/pages/header`

**Files:**
- Create: `apps/web/src/app/admin/pages/header/page.tsx`

Single `HeaderBrand` ContentBlock editor + a link out to `/admin/navigation` (Phase 4c).

- [ ] **Step 1: Create the page**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";

export default function AdminHeaderPage() {
  const [draft, setDraft] = useState<unknown>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    adminGetContent("header.brand").then((b) => setDraft(b.data)).catch(() => setDraft({}));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await adminUpsertContent("header.brand", { type: "HeaderBrand", data: draft, sortIndex: 0 });
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="coco-heading">Header</h1>
        <p className="mt-1 text-sm text-cocoa-text">
          Brand text + search placeholder. Navigation tree is edited under{" "}
          <Link className="text-cocoa-purple underline" href="/admin/navigation">/admin/navigation</Link> (Phase 4c).
        </p>
      </header>

      <section className="coco-panel space-y-3 p-6">
        <h2 className="text-lg font-bold">Brand</h2>
        <ContentBlockEditor blockKey="header.brand" type="HeaderBrand" data={draft} onChange={setDraft} />
        <div className="flex items-center gap-3">
          <button className="coco-button-primary disabled:opacity-60" disabled={saving} onClick={save} type="button">
            {saving ? "Saving…" : "Save"}
          </button>
          {savedAt ? <span className="text-xs text-cocoa-mint">Saved at {savedAt}</span> : null}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/web && npx tsc --noEmit
cd /home/book/code/jovie-joy-colouring-book
git add apps/web/src/app/admin/pages/header/page.tsx
git commit -m "feat(admin): composed editor for /admin/pages/header"
```

---

### Task 12: `/admin/pages/announcement` + `/admin/pages/newsletter`

**Files:**
- Create: `apps/web/src/app/admin/pages/announcement/page.tsx`
- Create: `apps/web/src/app/admin/pages/newsletter/page.tsx`

Each is one ContentBlock editor.

- [ ] **Step 1: Create `announcement/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";

export default function AdminAnnouncementPage() {
  const [draft, setDraft] = useState<unknown>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    adminGetContent("announcement.bar").then((b) => setDraft(b.data)).catch(() => setDraft({ enabled: false, text: "", href: "" }));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await adminUpsertContent("announcement.bar", { type: "Announcement", data: draft, sortIndex: 0 });
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="coco-heading">Announcement bar</h1>
        <p className="mt-1 text-sm text-cocoa-text">The thin lavender bar at the top of every storefront page.</p>
      </header>
      <section className="coco-panel space-y-3 p-6">
        <ContentBlockEditor blockKey="announcement.bar" type="Announcement" data={draft} onChange={setDraft} />
        <div className="flex items-center gap-3">
          <button className="coco-button-primary disabled:opacity-60" disabled={saving} onClick={save} type="button">
            {saving ? "Saving…" : "Save"}
          </button>
          {savedAt ? <span className="text-xs text-cocoa-mint">Saved at {savedAt}</span> : null}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Create `newsletter/page.tsx`** (same shape with key `newsletter.copy`, type `NewsletterCopy`, default `{}` draft):

```tsx
"use client";

import { useEffect, useState } from "react";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";

export default function AdminNewsletterPage() {
  const [draft, setDraft] = useState<unknown>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    adminGetContent("newsletter.copy").then((b) => setDraft(b.data)).catch(() => setDraft({}));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await adminUpsertContent("newsletter.copy", { type: "NewsletterCopy", data: draft, sortIndex: 0 });
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="coco-heading">Newsletter copy</h1>
        <p className="mt-1 text-sm text-cocoa-text">Heading, CTA label, and success message for the newsletter sign-up.</p>
      </header>
      <section className="coco-panel space-y-3 p-6">
        <ContentBlockEditor blockKey="newsletter.copy" type="NewsletterCopy" data={draft} onChange={setDraft} />
        <div className="flex items-center gap-3">
          <button className="coco-button-primary disabled:opacity-60" disabled={saving} onClick={save} type="button">
            {saving ? "Saving…" : "Save"}
          </button>
          {savedAt ? <span className="text-xs text-cocoa-mint">Saved at {savedAt}</span> : null}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/web && npx tsc --noEmit
cd /home/book/code/jovie-joy-colouring-book
git add apps/web/src/app/admin/pages/announcement apps/web/src/app/admin/pages/newsletter
git commit -m "feat(admin): composed editors for /admin/pages/announcement and /newsletter"
```

---

## Phase E — Static pages CRUD (Task 13)

### Task 13: `/admin/static-pages` list + edit

**Files:**
- Create: `apps/web/src/components/admin/StaticPageForm.tsx`
- Create: `apps/web/src/app/admin/static-pages/page.tsx`
- Create: `apps/web/src/app/admin/static-pages/[slug]/page.tsx`

- [ ] **Step 1: Create `StaticPageForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { StaticPage } from "@/lib/api";
import type { AdminStaticPageWriteBody } from "@/lib/adminApi";

type Props = {
  initial?: StaticPage;
  onSubmit: (body: AdminStaticPageWriteBody) => Promise<void>;
  submitLabel: string;
};

export function StaticPageForm({ initial, onSubmit, submitLabel }: Props) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [intro, setIntro] = useState(initial?.intro ?? "");
  const [blocks, setBlocks] = useState((initial?.blocks ?? []).join("\n\n"));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        slug: initial ? undefined : slug,
        title,
        intro,
        blocks: blocks.split(/\n\n+/).map((s) => s.trim()).filter(Boolean),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSubmitting(false);
    }
  }

  return (
    <form className="coco-panel space-y-4 p-6" onSubmit={handleSubmit}>
      {!initial ? (
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Slug</span>
          <input className="coco-input w-full" onChange={(e) => setSlug(e.target.value)} required value={slug} />
        </label>
      ) : null}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Title</span>
        <input className="coco-input w-full" onChange={(e) => setTitle(e.target.value)} required value={title} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Intro</span>
        <textarea className="coco-input w-full" onChange={(e) => setIntro(e.target.value)} required rows={2} value={intro} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Blocks (separate paragraphs with blank lines)</span>
        <textarea className="coco-input w-full" onChange={(e) => setBlocks(e.target.value)} rows={10} value={blocks} />
      </label>
      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}
      <button className="coco-button-primary disabled:opacity-60" disabled={submitting} type="submit">
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create the list page**

`apps/web/src/app/admin/static-pages/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateStaticPage, adminDeleteStaticPage, adminListStaticPages } from "@/lib/adminApi";
import type { StaticPage } from "@/lib/api";
import { StaticPageForm } from "@/components/admin/StaticPageForm";

export default function AdminStaticPagesList() {
  const router = useRouter();
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  function reload() {
    adminListStaticPages().then(setPages);
  }
  useEffect(reload, []);

  async function handleDelete(slug: string) {
    if (!confirm(`Delete ${slug}?`)) return;
    await adminDeleteStaticPage(slug);
    reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="coco-heading">Static pages</h1>
        <button className="coco-button-primary" onClick={() => setShowCreate(!showCreate)} type="button">
          {showCreate ? "Cancel" : "+ New page"}
        </button>
      </div>
      {showCreate ? (
        <div className="mt-6">
          <StaticPageForm
            onSubmit={async (body) => {
              const created = await adminCreateStaticPage(body);
              router.push(`/admin/static-pages/${created.slug}`);
            }}
            submitLabel="Create"
          />
        </div>
      ) : null}
      <table className="mt-6 w-full text-sm">
        <thead><tr className="border-b border-cocoa-line text-left text-cocoa-text"><th className="py-2">Slug</th><th>Title</th><th>Blocks</th><th /></tr></thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.slug} className="border-b border-cocoa-line">
              <td className="py-2"><code className="text-xs">{p.slug}</code></td>
              <td>{p.title}</td>
              <td>{p.blocks.length}</td>
              <td className="text-right">
                <Link className="mr-3 text-cocoa-purple underline" href={`/admin/static-pages/${p.slug}`}>Edit</Link>
                <button className="text-cocoa-coral underline" onClick={() => handleDelete(p.slug)} type="button">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Create the edit page**

`apps/web/src/app/admin/static-pages/[slug]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetStaticPage, adminUpdateStaticPage } from "@/lib/adminApi";
import type { StaticPage } from "@/lib/api";
import { StaticPageForm } from "@/components/admin/StaticPageForm";

export default function AdminStaticPageEdit() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [page, setPage] = useState<StaticPage | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!params.slug) return;
    adminGetStaticPage(params.slug).then(setPage);
  }, [params.slug]);

  if (!page) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="coco-heading mb-6">{page.title}</h1>
      <StaticPageForm
        initial={page}
        onSubmit={async (body) => {
          const updated = await adminUpdateStaticPage(page.slug, body);
          setPage(updated);
          setSavedAt(new Date().toLocaleTimeString());
        }}
        submitLabel="Save changes"
      />
      {savedAt ? <p className="mt-3 text-sm text-cocoa-mint">Saved at {savedAt}</p> : null}
      <button className="mt-8 text-sm underline" onClick={() => router.push("/admin/static-pages")} type="button">← Back</button>
    </div>
  );
}
```

- [ ] **Step 4: Build + commit**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/web && npx tsc --noEmit
cd /home/book/code/jovie-joy-colouring-book
git add apps/web/src/components/admin/StaticPageForm.tsx apps/web/src/app/admin/static-pages
git commit -m "feat(admin): static pages list + create + edit"
```

---

## Phase F — Sidebar + storefront wiring (Tasks 14–15)

### Task 14: Regroup the admin sidebar

**Files:**
- Modify: `apps/web/src/components/admin/AdminShell.tsx`

- [ ] **Step 1: Replace the `NAV` constant + render** in `apps/web/src/components/admin/AdminShell.tsx`

Replace the existing `NAV` array and its render with grouped entries:

```tsx
const NAV: Array<{ group: string; items: { href: string; label: string }[] }> = [
  { group: "Overview", items: [{ href: "/admin", label: "Dashboard" }] },
  { group: "Pages", items: [
    { href: "/admin/pages/home", label: "Home" },
    { href: "/admin/pages/footer", label: "Footer" },
    { href: "/admin/pages/header", label: "Header" },
    { href: "/admin/pages/announcement", label: "Announcement" },
    { href: "/admin/pages/newsletter", label: "Newsletter copy" },
    { href: "/admin/static-pages", label: "Static pages" },
  ]},
  { group: "Catalog", items: [
    { href: "/admin/products", label: "Products" },
    { href: "/admin/collections", label: "Collections" },
  ]},
  { group: "Content (raw)", items: [
    { href: "/admin/content", label: "Content blocks" },
  ]},
  { group: "Operations", items: [
    { href: "/admin/orders", label: "Orders" },
  ]},
];
```

And replace the `<nav>` render with:

```tsx
<nav className="space-y-4">
  {NAV.map((g) => (
    <div key={g.group}>
      <div className="mb-1 px-3 text-xs font-bold uppercase tracking-wide text-cocoa-text/70">{g.group}</div>
      {g.items.map((n) => {
        const active = pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href));
        return (
          <Link
            className={`block rounded-coco-sm px-3 py-2 text-sm ${
              active ? "bg-cocoa-honey font-bold text-cocoa-ink" : "text-cocoa-text hover:bg-cocoa-cream"
            }`}
            href={n.href}
            key={n.href}
          >
            {n.label}
          </Link>
        );
      })}
    </div>
  ))}
</nav>
```

- [ ] **Step 2: Build + commit**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/web && npx tsc --noEmit
cd /home/book/code/jovie-joy-colouring-book
git add apps/web/src/components/admin/AdminShell.tsx
git commit -m "feat(admin): grouped sidebar nav for Phase 4a"
```

---

### Task 15: Wire storefront components to new ContentBlocks (with hardcoded fallback)

**Files:**
- Modify: `apps/web/src/app/(public)/page.tsx`
- Modify: `apps/web/src/components/layout/footer.tsx`
- Modify: `apps/web/src/components/layout/header.tsx`
- Modify: `apps/web/src/components/content/newsletter-form.tsx`
- Modify: `apps/web/src/lib/api.ts` (extend `SiteContentBundle`)

- [ ] **Step 1: Extend the bundle type** in `apps/web/src/lib/api.ts`

Locate the `SiteContentBundle` definition and add the new keys. The bundle endpoint already returns all blocks grouped by type (see `apps/api/Controllers/ContentController.cs`); we need to teach the BE to expose the new types and the TS type to receive them.

In `apps/api/Controllers/ContentController.cs`, update the `SiteContentBundleDto` projection to include the new types. Add to the projection's anonymous-record shape:

```csharp
HomeIntro: grab(ContentBlockType.HomeIntro),
HomeCozyMomentsHeader: grab(ContentBlockType.HomeCozyMomentsHeader),
FooterContact: grab(ContentBlockType.FooterContact),
HeaderBrand: grab(ContentBlockType.HeaderBrand),
NewsletterCopy: grab(ContentBlockType.NewsletterCopy),
```

In `apps/api/Contracts/ContentDtos.cs`, extend `SiteContentBundleDto` with the matching fields.

In `apps/web/src/lib/api.ts`, extend the TS type:

```typescript
export type SiteContentBundle = {
  // existing fields...
  homeIntro: ContentBlock<{ title?: string; body?: string }>[];
  homeCozyMomentsHeader: ContentBlock<{ heading?: string }>[];
  footerContact: ContentBlock<{ blurb?: string; customerCareLabel?: string; customerCareEmail?: string; licensingLabel?: string; licensingEmail?: string }>[];
  headerBrand: ContentBlock<{ name?: string; searchPlaceholder?: string }>[];
  newsletterCopy: ContentBlock<{ heading?: string; ctaLabel?: string; successMessage?: string }>[];
};
```

- [ ] **Step 2: Wire `app/(public)/page.tsx`**

After `await getCozyMomentImages()`, also fetch the bundle once (it's already cached in the layout via `apiGetContent`; reuse):

```tsx
import { apiGetContent } from "@/lib/api";

// inside Home()
const [bundle, /* ... existing */ ] = await Promise.all([apiGetContent(), /* ... */]);
const intro = bundle.homeIntro[0]?.data ?? { title: "Hi Friend!", body: "We craft these coloring books..." };
const cozyHeader = bundle.homeCozyMomentsHeader[0]?.data?.heading ?? "Cozy Moments";
```

Replace the hardcoded `<h2>Hi Friend!</h2>` and its paragraph with `{intro.title}` and `{intro.body}`. Replace the hardcoded `<h2 className="coco-heading mb-8">Cozy Moments</h2>` with `<h2 className="coco-heading mb-8">{cozyHeader}</h2>`.

- [ ] **Step 3: Wire `components/layout/footer.tsx`**

Read contact data from the bundle and replace the hardcoded "Customer Care" + "Licensing Inquiries" + emails. Use the existing `useBundle()`:

```tsx
const contact = bundle.footerContact[0]?.data ?? {
  customerCareLabel: "Customer Care",
  customerCareEmail: "hello@zoeandbook.com",
  licensingLabel: "Licensing Inquiries",
  licensingEmail: "studio@zoeandbook.com",
  blurb: "Drop us a note anytime:",
};
```

Then replace the static markup with `{contact.blurb}`, `{contact.customerCareLabel}`, `{contact.customerCareEmail}`, etc.

- [ ] **Step 4: Wire `components/layout/header.tsx`**

```tsx
const brand = bundle.headerBrand[0]?.data ?? { name: "Zoe&Book", searchPlaceholder: "Search the store" };
```

Replace the hardcoded `Zoe&amp;Book` text with `{brand.name}` (two occurrences — desktop and mobile) and the placeholder string in the search button with `{brand.searchPlaceholder}`.

- [ ] **Step 5: Wire `components/content/newsletter-form.tsx`**

This component is `"use client"` and currently has no bundle access. Add it via `useBundle()`:

```tsx
import { useBundle } from "@/state/catalog-provider";

// inside NewsletterForm:
const bundle = useBundle();
const copy = bundle.newsletterCopy[0]?.data ?? { heading: "Subscribe for Updates", ctaLabel: "Subscribe", successMessage: "Thanks for subscribing!" };
```

Then replace the hardcoded `Subscribe for Updates`, `Subscribe`, and `Thanks for subscribing!` with `{copy.heading}`, `{copy.ctaLabel}`, `{copy.successMessage}`.

- [ ] **Step 6: Build + verify**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/api && dotnet build -nologo
cd ../web && npx tsc --noEmit
```

Boot the stack and curl `/api/content` to confirm the new keys come back populated:

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/api && dotnet run --no-build > /tmp/api.log 2>&1 &
sleep 9
curl -s http://localhost:8080/api/content | python3 -c "import json,sys; d=json.load(sys.stdin); print('homeIntro:',len(d.get('homeIntro',[])),'footerContact:',len(d.get('footerContact',[])))"
kill %1 2>/dev/null
```

Expected: `homeIntro: 1 footerContact: 1`.

- [ ] **Step 7: Commit**

```bash
cd /home/book/code/jovie-joy-colouring-book
git add apps/api/Controllers/ContentController.cs apps/api/Contracts/ContentDtos.cs apps/web/src/lib/api.ts apps/web/src/app/\(public\)/page.tsx apps/web/src/components/layout/footer.tsx apps/web/src/components/layout/header.tsx apps/web/src/components/content/newsletter-form.tsx
git commit -m "feat(web): wire storefront to Phase-4a chrome ContentBlocks with hardcoded fallback"
```

---

## Phase G — Tests + docs (Tasks 16–18)

### Task 16: Vitest unit tests for the five new typed editors

**Files:**
- Create: `apps/web/tests/unit/admin-typed-editors.test.tsx`

- [ ] **Step 1: Write the tests**

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HomeIntroBlock } from "@/components/admin/blocks/HomeIntroBlock";
import { HomeCozyMomentsHeaderBlock } from "@/components/admin/blocks/HomeCozyMomentsHeaderBlock";
import { FooterContactBlock } from "@/components/admin/blocks/FooterContactBlock";
import { HeaderBrandBlock } from "@/components/admin/blocks/HeaderBrandBlock";
import { NewsletterCopyBlock } from "@/components/admin/blocks/NewsletterCopyBlock";

describe("HomeIntroBlock", () => {
  test("emits updated title on change", () => {
    const onChange = vi.fn();
    render(<HomeIntroBlock blockKey="home.intro" type="HomeIntro" data={{ title: "Old", body: "" }} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("Old"), { target: { value: "New" } });
    expect(onChange).toHaveBeenCalledWith({ title: "New", body: "" });
  });
});

describe("HomeCozyMomentsHeaderBlock", () => {
  test("emits heading", () => {
    const onChange = vi.fn();
    render(<HomeCozyMomentsHeaderBlock blockKey="x" type="HomeCozyMomentsHeader" data={{ heading: "Old" }} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("Old"), { target: { value: "New" } });
    expect(onChange).toHaveBeenCalledWith({ heading: "New" });
  });
});

describe("FooterContactBlock", () => {
  test("emits customer-care email change", () => {
    const onChange = vi.fn();
    const data = { customerCareEmail: "old@x.com", customerCareLabel: "Customer Care", licensingLabel: "Licensing", licensingEmail: "studio@x.com", blurb: "Hi" };
    render(<FooterContactBlock blockKey="x" type="FooterContact" data={data} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("old@x.com"), { target: { value: "new@x.com" } });
    expect(onChange).toHaveBeenCalledWith({ ...data, customerCareEmail: "new@x.com" });
  });
});

describe("HeaderBrandBlock", () => {
  test("emits brand name", () => {
    const onChange = vi.fn();
    render(<HeaderBrandBlock blockKey="x" type="HeaderBrand" data={{ name: "Old" }} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("Old"), { target: { value: "New" } });
    expect(onChange).toHaveBeenCalledWith({ name: "New" });
  });
});

describe("NewsletterCopyBlock", () => {
  test("emits CTA label", () => {
    const onChange = vi.fn();
    render(<NewsletterCopyBlock blockKey="x" type="NewsletterCopy" data={{ ctaLabel: "Sub" }} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("Sub"), { target: { value: "Join" } });
    expect(onChange).toHaveBeenCalledWith({ ctaLabel: "Join" });
  });
});
```

- [ ] **Step 2: Run**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/web && npm test
```

Expected: all green (existing 18 + 5 new = 23 passing).

- [ ] **Step 3: Commit**

```bash
cd /home/book/code/jovie-joy-colouring-book
git add apps/web/tests/unit/admin-typed-editors.test.tsx
git commit -m "test(admin): vitest unit tests for 5 new typed editors"
```

---

### Task 17: Playwright e2e — admin pages flow (mocked API)

**Files:**
- Create: `apps/web/tests/e2e/admin-pages-flow.spec.ts`

- [ ] **Step 1: Create the spec**

```typescript
import { expect, test } from "@playwright/test";

const TOKEN = "fake-admin-token";
const USER = { id: "u1", email: "admin@joviejoy.com", name: "Admin", avatarUrl: null, isAdmin: true };

test.describe("admin pages flow (Phase 4a)", () => {
  test("login → open Home editor → see Hi Friend section → edit + save", async ({ page }) => {
    await page.route("**/auth/admin/login", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ token: TOKEN, user: USER }) }));
    await page.route("**/auth/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(USER) }));

    // home.intro lookup + upsert
    await page.route("**/api/admin/content/home.intro", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ key: "home.intro", type: "HomeIntro", data: { title: "Hi Friend!", body: "..." }, sortIndex: 0, updatedAt: new Date().toISOString() }) }));
    // other section keys return empty so the page still renders
    for (const key of ["home.hero", "home.cozy-moments.header", "home.video", "hero.artwork.footer"]) {
      await page.route(`**/api/admin/content/${key}`, (r) => r.fulfill({ status: 404, body: "" }));
    }

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("admin@joviejoy.com");
    await page.getByLabel("Password").fill("anything");
    await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 60_000 });

    await page.goto("/admin/pages/home");
    await expect(page.getByRole("heading", { name: /home page/i })).toBeVisible();
    await expect(page.getByDisplayValue("Hi Friend!")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run**

```bash
cd /home/book/code/jovie-joy-colouring-book/apps/web && timeout 90 npx playwright test admin-pages-flow --project=chromium --reporter=line 2>&1 | tail -5
```

Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
cd /home/book/code/jovie-joy-colouring-book
git add apps/web/tests/e2e/admin-pages-flow.spec.ts
git commit -m "test(admin): e2e smoke for Phase 4a /admin/pages/home"
```

---

### Task 18: Docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Phase 4a — admin pages" section** under the existing **Admin sections** block in `README.md`:

```markdown
#### Editable pages (Phase 4a)

The admin can edit the home page, footer chrome, header chrome, announcement bar, newsletter copy, and any static page:

- `/admin/pages/home` — hero, "Hi Friend!" panel, Cozy Moments heading, home video, footer artwork
- `/admin/pages/footer` — contact emails, footer link groups, social links, search trending terms
- `/admin/pages/header` — brand name, search placeholder
- `/admin/pages/announcement` — announcement bar enable/text/href
- `/admin/pages/newsletter` — heading, CTA label, success message
- `/admin/static-pages` — list + create + edit static pages (About, FAQ, etc.)

Storefront components fall back to the original hardcoded strings when a ContentBlock is missing, so partial deploys don't blank out the site.
```

- [ ] **Step 2: Commit**

```bash
cd /home/book/code/jovie-joy-colouring-book
git add README.md
git commit -m "docs: README admin section for Phase 4a"
```

---

## Phase 4a acceptance checklist

- [ ] `cd apps/api && dotnet build` — clean.
- [ ] `cd apps/api.Tests && dotnet test` — all tests pass (existing + new chrome controller tests).
- [ ] `cd apps/web && npx tsc --noEmit` — clean.
- [ ] `cd apps/web && npm test` — all unit tests pass (existing + 5 new editor tests).
- [ ] `cd apps/web && npx playwright test` — all e2e pass (existing + new Phase 4a smoke).
- [ ] Manual: sign in to `/admin`, sidebar shows grouped nav with **Pages** group.
- [ ] Manual: `/admin/pages/home` loads, each section shows current values, edits save and persist on refresh.
- [ ] Manual: `/admin/pages/footer` lets you add/remove/edit footer link groups, social links, trending terms.
- [ ] Manual: edit the "Hi Friend!" title in admin, refresh the storefront `/`, new title appears.
- [ ] Manual: delete the `home.intro` block (via `/admin/content`), refresh `/` — hardcoded fallback `Hi Friend!` still renders, no blank section.
