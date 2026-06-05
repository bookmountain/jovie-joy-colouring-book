# Admin CRUD Reliability & UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every admin module's create/update/delete reliably persist AND show on the storefront immediately, with modern UX (toast feedback, no native `confirm()`/`alert()`), proven by backend unit tests and Playwright admin→storefront e2e flows running against the local Docker stack.

**Architecture:** Three layers of change. (1) A **global foundation**: fix the Next.js content-cache so admin edits reflect immediately, add a `sonner` toast system mounted in the admin layout, and reuse the existing `AdminConfirmDialog`. (2) A **per-module rollout** that applies those primitives (toast on save/delete, dialog instead of `confirm`) to all ~25 admin pages. (3) **Test coverage**: xUnit controller tests (in-memory `WebApplicationFactory`) for every admin CRUD controller currently missing them, plus a Playwright e2e per content module that edits in `/admin/*` and asserts the change on the public page.

**Tech Stack:** .NET 9 Web API (`apps/api`) + EF Core (Npgsql, local Postgres on `localhost:5433`), Next.js 15 App Router (`apps/web`), Vitest (unit), Playwright (e2e), xUnit (`apps/api.Tests`), `sonner` (toasts).

---

## Ground truth (verified 2026-06-05)

- **Root cause of "edits don't reflect":** `apps/web/src/lib/api.ts` `get<T>()` defaults content loaders to `next: { revalidate: 60 }` (ISR). Catalog loaders opt into `cache: "no-store"`; content loaders (blogs, about, comics, pages, site content) do not — so storefront serves stale content for up to 60s after an admin save, and there is no on-demand revalidation. **Only manifests in a production build** (`next build && next start`); Next dev mode renders dynamically.
- The save handlers and API controllers store text verbatim — no truncation in the local data path. The "How to Colo"/"lif" seen on production is stale production data, not a reproducible local bug.
- **Local stack runs:** Postgres in Docker on host `5433`. `apps/api/.env.local` was pointing at `5432` (fixed to `5433` in Phase 0). API auto-runs `db.Database.Migrate()` + `DbSeeder.SeedAsync` on startup. Admin login: `admin@joviejoy.com` / `changeme123` (from `.env.local`).
- `AdminConfirmDialog` + `AdminModal` already exist in `apps/web/src/components/admin/ui/` (built for `/admin/freebies`). Reuse them; do not build new dialogs.
- No toast library installed yet.
- Backend test harness: `apps/api.Tests/ApiFactory.cs` = `WebApplicationFactory<Program>` with isolated in-memory EF DB + `CreateAdminClientAsync()` (signs a test JWT). xUnit `IClassFixture<ApiFactory>`. Follow `AdminProductsListTests.cs`.
- Admin pages still using native `confirm()`/`alert()` (13): `comics/[id]`, `comics`, `faq`, `content`, `products`, `about`, `gallery`, `blog/[slug]`, `static-pages`, `blog`, `featured-on`, `collections`, `pages/footer`.
- Admin controllers WITHOUT backend tests: `AdminBlogs`, `AdminCollections`, `AdminComics`, `AdminGallery`, `AdminAbout`, `AdminFaqs`, `AdminStaticPages`, `AdminFooterLinks`, `AdminSocialLinks`, `AdminFeaturedOn`, `AdminTrendingTerms`, `AdminContent`. (Products/Freebies already covered.)

---

## Phase 0: Local dev stack (foundation — mostly done)

### Task 0.1: Lock in the local DB port fix

**Files:**
- Modify: `apps/api/.env.local` (already changed: `Port=5432` → `Port=5433`)

- [ ] **Step 1: Verify the stack is healthy**

Run:
```bash
docker ps --filter name=jovie --format '{{.Names}} {{.Status}} {{.Ports}}'
curl -s -o /dev/null -w "api %{http_code}\n" http://localhost:8080/api/blogs
```
Expected: container `Up ... 0.0.0.0:5433->5432`, `api 200`.

- [ ] **Step 2: Document the runbook in README**

Add a "Local dev" section to `README.md` with the exact commands:
```bash
docker compose up -d db                 # Postgres on localhost:5433
cd apps/api && dotnet run                # API on :8080, auto-migrates + seeds
cd apps/web && npm run dev               # storefront + admin on :3000
# To reproduce caching behaviour faithfully: cd apps/web && npm run build && npm start
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/.env.local README.md
git commit -m "fix(api): point local dev DB at docker port 5433 + document runbook"
```

---

## Phase 1: Global foundation

### Task 1.1: Make storefront reflect admin edits immediately

**Files:**
- Modify: `apps/web/src/lib/api.ts` (the `get<T>()` default-cache branch)
- Test: `apps/web/tests/e2e/admin-blog-reflects.spec.ts` (new; full code in Task 2.1)

**Decision:** Flip the content-loader default from `next: { revalidate: 60 }` to `cache: "no-store"`, matching the existing catalog-loader convention so every admin-editable content domain shows changes immediately. (On-demand `revalidateTag` is a later optimization, out of scope.)

- [ ] **Step 1: Write the failing e2e** — deferred to Task 2.1 (it needs the toast + prod build). For this task, verify via curl that the API is always fresh (it is) and that the fix removes the Next cache layer.

- [ ] **Step 2: Change the default cache mode**

In `apps/web/src/lib/api.ts`, replace:
```ts
  if (!fetchInit.cache && !fetchInit.next) {
    fetchInit.next = { revalidate: 60 };
  }
```
with:
```ts
  // Admin edits must show on the storefront immediately. Content loaders therefore
  // default to no-store (same convention as the catalog loaders). Pass an explicit
  // `next`/`cache` in a caller to opt back into caching for truly static content.
  if (!fetchInit.cache && !fetchInit.next) {
    fetchInit.cache = "no-store";
  }
```

- [ ] **Step 3: Update the file header comment** (lines 1-3) to state content loaders default to `no-store`.

- [ ] **Step 4: Build to confirm no type/route errors**

Run: `cd apps/web && npm run build`
Expected: build succeeds; routes that were static become dynamic (`ƒ`) — that is intended.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/api.ts
git commit -m "fix(web): serve admin-editable content uncached so edits reflect immediately"
```

### Task 1.2: Toast system (sonner) in the admin shell

**Files:**
- Modify: `apps/web/package.json` (add `sonner`)
- Create: `apps/web/src/components/admin/ui/AdminToaster.tsx`
- Create: `apps/web/src/lib/toast.ts`
- Modify: `apps/web/src/app/admin/layout.tsx` (mount the toaster)
- Modify: `apps/web/src/components/admin/ui/index.ts` (export AdminToaster)
- Test: `apps/web/tests/unit/admin-toast.test.ts` (new)

- [ ] **Step 1: Install sonner**

Run: `cd apps/web && npm install sonner@^1`
Expected: `sonner` appears in `package.json` dependencies.

- [ ] **Step 2: Write the failing unit test**

Create `apps/web/tests/unit/admin-toast.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { toast as sonner } from "sonner";
import { notifySaved, notifyError } from "@/lib/toast";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("admin toast helpers", () => {
  it("notifySaved shows a success toast with the given label", () => {
    notifySaved("Category");
    expect(sonner.success).toHaveBeenCalledWith("Category saved");
  });

  it("notifyError shows the error message", () => {
    notifyError(new Error("boom"));
    expect(sonner.error).toHaveBeenCalledWith("boom");
  });

  it("notifyError falls back to a generic message for non-Errors", () => {
    notifyError("weird");
    expect(sonner.error).toHaveBeenCalledWith("Something went wrong");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd apps/web && npx vitest run tests/unit/admin-toast.test.ts`
Expected: FAIL — `@/lib/toast` not found.

- [ ] **Step 4: Implement the helper**

Create `apps/web/src/lib/toast.ts`:
```ts
import { toast } from "sonner";

/** Success toast for a completed save/create. `label` is the noun, e.g. "Category". */
export function notifySaved(label = "Changes"): void {
  toast.success(`${label} saved`);
}

/** Success toast for a delete. */
export function notifyDeleted(label = "Item"): void {
  toast.success(`${label} deleted`);
}

/** Error toast — accepts an Error, a string, or anything. */
export function notifyError(e: unknown): void {
  const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Something went wrong";
  toast.error(msg);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run tests/unit/admin-toast.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Create the Toaster component**

Create `apps/web/src/components/admin/ui/AdminToaster.tsx`:
```tsx
"use client";

import { Toaster } from "sonner";

export function AdminToaster() {
  return <Toaster position="bottom-right" richColors closeButton />;
}
```

- [ ] **Step 7: Mount it in the admin layout**

In `apps/web/src/app/admin/layout.tsx`, import `AdminToaster` from `@/components/admin/ui` and render it inside `admin-route-root`, after `<AdminShell>`:
```tsx
        <div className="admin-route-root">
          <AdminShell>{children}</AdminShell>
          <AdminToaster />
        </div>
```

- [ ] **Step 8: Export AdminToaster** — add `export * from "./AdminToaster";` to `apps/web/src/components/admin/ui/index.ts`.

- [ ] **Step 9: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/src/lib/toast.ts apps/web/src/components/admin/ui/AdminToaster.tsx apps/web/src/app/admin/layout.tsx apps/web/src/components/admin/ui/index.ts apps/web/tests/unit/admin-toast.test.ts
git commit -m "feat(admin): add sonner toast system + notify helpers"
```

---

## Phase 2: Per-module FE rollout

Each content module gets the **same three edits**. The Blog module (Task 2.1) is the fully-worked exemplar; every other module in the table repeats the identical pattern with its own nouns/strings.

**The rollout recipe (apply per module):**
1. **Save/create feedback:** in each `save`/`create` success path, after the state update call `notifySaved("<Noun>")`; in the `catch`, call `notifyError(e)` (keep existing inline error text if present). Import from `@/lib/toast`.
2. **Delete feedback + dialog:** replace `if (!confirm(...)) return;` with `AdminConfirmDialog` state. Add `const [pendingDelete, setPendingDelete] = useState<Row | null>(null)`; the Delete button sets it; render `<AdminConfirmDialog open={!!pendingDelete} ... />`; on confirm run the delete then `notifyDeleted("<Noun>")` and `setPendingDelete(null)`.
3. **Remove every `alert(...)`** — replace with `notifyError(...)` (errors) or `toast.success(...)` (info).

### Task 2.1: Blog module (exemplar — full code)

**Files:**
- Modify: `apps/web/src/app/admin/blog/page.tsx`
- Modify: `apps/web/src/app/admin/blog/[slug]/page.tsx`
- Test: `apps/web/tests/e2e/admin-blog-reflects.spec.ts` (new)

- [ ] **Step 1: Add imports** to `apps/web/src/app/admin/blog/page.tsx`:
```ts
import { AdminConfirmDialog } from "@/components/admin/ui";
import { notifySaved, notifyDeleted, notifyError } from "@/lib/toast";
```

- [ ] **Step 2: Add delete-dialog state** — after the `error` state declaration:
```ts
const [pendingDelete, setPendingDelete] = useState<AdminBlogCategory | null>(null);
```

- [ ] **Step 3: Toast on save** — change the `save` body's success/catch:
```ts
  async function save(row: AdminBlogCategory) {
    setError(null);
    try {
      const saved = await adminUpdateBlogCategory(row.slug, {
        title: row.title, excerpt: row.excerpt, image: row.image, sortIndex: row.sortIndex,
      });
      update(row.slug, saved);
      notifySaved("Category");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      notifyError(e);
    }
  }
```

- [ ] **Step 4: Replace `confirm()` delete** — rewrite `remove` to run without the native prompt (the dialog gates it now) and toast:
```ts
  async function remove(slug: string) {
    setError(null);
    try {
      await adminDeleteBlogCategory(slug);
      setRows((cur) => cur.filter((r) => r.slug !== slug));
      notifyDeleted("Category");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      notifyError(e);
    } finally {
      setPendingDelete(null);
    }
  }
```

- [ ] **Step 5: Toast on create** — in `create`, after `setDraft({ ...EMPTY })` add `notifySaved("Category");` and in the `catch` add `notifyError(e);`.

- [ ] **Step 6: Wire the Delete button to the dialog** — change the row Delete button `onClick` from `() => remove(row.slug)` to `() => setPendingDelete(row)`.

- [ ] **Step 7: Render the dialog** — before the closing `</div>` of the component return:
```tsx
      <AdminConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.title || pendingDelete?.slug}"?`}
        body="This removes the category and ALL its articles. This cannot be undone."
        confirmLabel="Delete category"
        destructive
        onConfirm={() => pendingDelete && remove(pendingDelete.slug)}
        onCancel={() => setPendingDelete(null)}
      />
```

- [ ] **Step 8: Repeat steps 1-7 for `blog/[slug]/page.tsx`** (articles) using noun `"Article"` and its own `confirm()` site.

- [ ] **Step 9: Write the failing e2e**

Create `apps/web/tests/e2e/admin-blog-reflects.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

// Requires API on :8080 and the web server (playwright webServer on :3100).
const ADMIN_EMAIL = "admin@joviejoy.com";
const ADMIN_PASSWORD = "changeme123";

async function login(page) {
  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin(\/|$)/);
}

test("editing a blog category title shows on the storefront and toasts", async ({ page }) => {
  await login(page);
  await page.goto("/admin/blog");

  const unique = `How to Color ${Date.now()}`;
  const titleInput = page.locator('#bc-title-htc');
  await titleInput.fill(unique);
  await page.getByRole("button", { name: /^save$/i }).first().click();

  // 1. Toast feedback appears
  await expect(page.getByText(/category saved/i)).toBeVisible();

  // 2. Storefront reflects the change immediately (no 60s ISR wait)
  await page.goto("/blogs/htc");
  await expect(page.getByRole("heading", { name: unique })).toBeVisible();
});
```

- [ ] **Step 10: Run e2e (will FAIL until prod build + this module done, then PASS)**

Run: `cd apps/web && npx playwright test tests/e2e/admin-blog-reflects.spec.ts`
Expected: PASS — toast visible AND storefront shows the new title.

- [ ] **Step 11: Run unit + lint**

Run: `cd apps/web && npx vitest run && npm run lint`
Expected: PASS, no lint errors.

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/app/admin/blog apps/web/tests/e2e/admin-blog-reflects.spec.ts
git commit -m "feat(admin): blog save/delete toasts + confirm dialog + reflects e2e"
```

### Tasks 2.2–2.13: Remaining modules (same recipe)

For each row: apply the rollout recipe (toast on save/create/delete, replace `confirm`/`alert` with `AdminConfirmDialog`+toast), run `npx vitest run && npm run lint`, then commit `feat(admin): <module> save/delete toasts + confirm dialog`.

| Task | Page file(s) | Delete noun | Confirm dialog title |
|------|--------------|-------------|----------------------|
| 2.2 | `admin/products/page.tsx` | Product | `Delete "<title>"?` |
| 2.3 | `admin/collections/page.tsx` | Collection | `Delete collection "<title>"?` |
| 2.4 | `admin/comics/page.tsx` + `admin/comics/[id]/page.tsx` | Comic / World | `Delete "<title>"?` |
| 2.5 | `admin/gallery/page.tsx` | Image | `Delete this image?` |
| 2.6 | `admin/about/page.tsx` | Section | `Delete section "<title>"?` |
| 2.7 | `admin/faq/page.tsx` | FAQ | `Delete this FAQ?` |
| 2.8 | `admin/static-pages/page.tsx` | Page | `Delete page "<slug>"?` |
| 2.9 | `admin/featured-on/page.tsx` | Link | `Delete "<label>"?` |
| 2.10 | `admin/content/page.tsx` | Block | `Delete block "<key>"?` |
| 2.11 | `admin/pages/footer/page.tsx` | Footer link | `Delete this link?` |
| 2.12 | `admin/freebies/page.tsx` | Freebie | (dialog already present — add save/create toasts only) |
| 2.13 | Audit sweep: `grep -rn 'confirm(\|alert(' apps/web/src/app/admin` returns nothing | — | — |

- [ ] **Final step (2.13): verify the audit sweep is clean**

Run: `grep -rn 'confirm(\|alert(\|window.prompt' apps/web/src/app/admin`
Expected: no matches.

---

## Phase 3: Backend CRUD unit tests (gap fill)

For each missing admin controller, add an xUnit test class in `apps/api.Tests/` modeled on `AdminProductsListTests.cs`: `IClassFixture<ApiFactory>`, `CreateAdminClientAsync()`, exercise **create → list → update → get/list reflects update → delete → 404**, plus one **401 when unauthenticated** (`_f.CreateClient()` with no token). Run `dotnet test` after each; commit per controller.

### Task 3.1: AdminBlogsController (exemplar — full code)

**Files:**
- Create: `apps/api.Tests/AdminBlogsControllerTests.cs`

- [ ] **Step 1: Write the failing test**

Create `apps/api.Tests/AdminBlogsControllerTests.cs`:
```csharp
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using JovieJoy.Api.Contracts;
using Xunit;

namespace JovieJoy.Api.Tests;

public class AdminBlogsControllerTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    public AdminBlogsControllerTests(ApiFactory f) => _f = f;

    [Fact]
    public async Task Category_crud_roundtrip_persists_and_reflects_update()
    {
        var client = await _f.CreateAdminClientAsync();
        var slug = $"cat-{System.Guid.NewGuid():N}";

        // Create
        var create = await client.PostAsJsonAsync("/api/admin/blogs",
            new { slug, title = "Original", excerpt = "ex", image = "", sortIndex = 0 });
        create.EnsureSuccessStatusCode();

        // Update
        var update = await client.PutAsJsonAsync($"/api/admin/blogs/{slug}",
            new { title = "Renamed", excerpt = "ex2", image = "", sortIndex = 1 });
        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<BlogCategoryDto>();
        Assert.Equal("Renamed", updated!.Title);

        // List reflects the update (this is the "does it actually persist" check)
        var list = await client.GetFromJsonAsync<BlogCategoryDto[]>("/api/admin/blogs");
        Assert.Contains(list!, c => c.Slug == slug && c.Title == "Renamed");

        // Delete -> gone
        var del = await client.DeleteAsync($"/api/admin/blogs/{slug}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var after = await client.GetFromJsonAsync<BlogCategoryDto[]>("/api/admin/blogs");
        Assert.DoesNotContain(after!, c => c.Slug == slug);
    }

    [Fact]
    public async Task Requires_admin_auth()
    {
        var anon = _f.CreateClient();
        var res = await anon.GetAsync("/api/admin/blogs");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }
}
```

- [ ] **Step 2: Run to verify it passes**

Run: `cd apps/api.Tests && dotnet test --filter AdminBlogsControllerTests`
Expected: PASS (2 tests). If the DTO type name differs, fix the `using`/type to match `apps/api/Contracts`.

- [ ] **Step 3: Commit**

```bash
git add apps/api.Tests/AdminBlogsControllerTests.cs
git commit -m "test(api): admin blogs CRUD roundtrip + auth"
```

### Tasks 3.2–3.12: Remaining controllers

Repeat Task 3.1's pattern. Before writing each, open the controller in `apps/api/Controllers/Admin/` to copy its exact route prefix, request DTO shape, and key field, and the response DTO from `apps/api/Contracts`.

| Task | Controller | Route prefix | Key field |
|------|------------|--------------|-----------|
| 3.2 | AdminCollectionsController | `/api/admin/collections` | slug |
| 3.3 | AdminComicsController | `/api/admin/comics` | id/slug |
| 3.4 | AdminGalleryController | `/api/admin/gallery` | id |
| 3.5 | AdminAboutController | `/api/admin/about` | id |
| 3.6 | AdminFaqsController | `/api/admin/faqs` | slug |
| 3.7 | AdminStaticPagesController | `/api/admin/static-pages` | slug |
| 3.8 | AdminFooterLinksController | `/api/admin/footer-links` | id |
| 3.9 | AdminSocialLinksController | `/api/admin/social-links` | id |
| 3.10 | AdminFeaturedOnController | `/api/admin/featured-on` | slug |
| 3.11 | AdminTrendingTermsController | `/api/admin/trending-terms` | term |
| 3.12 | AdminContentController | `/api/admin/content` | key |

- [ ] **After 3.12: run the whole backend suite**

Run: `cd apps/api.Tests && dotnet test`
Expected: all green.

---

## Phase 4: Full verification

### Task 4.1: Green build + all suites against the local stack

- [ ] **Step 1: Backend** — `cd apps/api.Tests && dotnet test` → all pass.
- [ ] **Step 2: Web unit** — `cd apps/web && npx vitest run` → all pass.
- [ ] **Step 3: Web lint + build** — `cd apps/web && npm run lint && npm run build` → clean.
- [ ] **Step 4: e2e against prod build** — `cd apps/web && npm run build && (npm start &) && npx playwright test` (ensure API on :8080 first) → all pass, especially the `*-reflects.spec.ts` files.
- [ ] **Step 5: Manual smoke** — log into `/admin`, edit Blog + Products + one more module, confirm toast appears and the storefront page updates on reload.

### Task 4.2: Finish the branch

Use `superpowers:finishing-a-development-branch` to open a PR summarizing: caching fix (root cause of "edits don't reflect"), toast system, confirm-dialog rollout, and the new test coverage.

---

## Self-review notes

- **Spec coverage:** "run locally for every admin CRUD update API" → Phase 0 + Phase 3 (every admin controller tested against in-memory `Program`); "write unit tests" → Phase 3 + 1.2; "check FE for every admin module / test the flow" → Phase 2 rollout + `*-reflects` e2e; "don't use alarm modal" → Phase 2 confirm/alert removal (audit in 2.13); "save gives feedback" → Phase 1.2 toasts applied in Phase 2; "didn't reflect the update" → Phase 1.1.
- **Type consistency:** `notifySaved`/`notifyDeleted`/`notifyError` signatures fixed in Task 1.2 and used unchanged in Phase 2. `AdminConfirmDialog` props match the existing component (`open`, `title`, `body`, `confirmLabel`, `destructive`, `onConfirm`, `onCancel`).
- **Open risk:** exact admin route prefixes / DTO names in Phase 3 must be read from each controller before writing its test (noted in 3.2–3.12).
