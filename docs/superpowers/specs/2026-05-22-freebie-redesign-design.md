# Freebie redesign — email-gated downloads

**Date:** 2026-05-22
**Status:** Spec, awaiting plan
**Author:** Book (with Claude)

## Problem

Freebies are currently `Product` rows with `ProductType.Freebie` and price 0,
surfaced on `/pages/freebies` through the standard product grid. Clicking a
freebie navigates to `/products/{slug}` — the regular product page — which is
the wrong UX. Freebies aren't products; they're lead magnets. The intended
flow is:

1. Browse a grid of freebies.
2. Click a freebie → modal with an email field.
3. Submit email → receive an email with a tokenised download link.
4. Open the link → file streams down (PDF or ZIP).

We also want to collect those emails for future promotion (opt-in, default
checked).

## Goals

- Freebies are their own entity, decoupled from `Product`, `Collection`, and
  checkout.
- Every freebie download is gated by an email submission.
- Submitted emails are stored per-freebie *and* auto-subscribed to the
  newsletter when the user leaves the opt-in box checked.
- Download links are tokenised and expire after 7 days.
- Admin gets a dedicated `/admin/freebies` workspace under "Site content".
- The `freebies` collection and `ProductType.Freebie` enum value are retired
  from active use.

## Non-goals

- Real Resend account / production email deliverability — placeholder env
  credentials only. The HTTP client must be wired; if `Resend__ApiKey` is
  empty, the sender logs to console and returns success (dev-noop).
- Unsubscribe UI beyond a basic `/pages/freebies?unsubscribe={email}`
  link in the email footer.
- Range requests / resumable downloads (files are < 15 MB).
- Promotion campaign UI — only collection of emails for later use.
- Removing the `Freebie` enum value from C# (left in place with `[Obsolete]`
  to avoid migration risk; no code references it after this change).

## Architecture

```
Storefront (/pages/freebies)
    ↓ click card
<EmailGateModal>: email input + opt-in checkbox
    ↓ POST /api/freebies/{slug}/request
API
    ├── upsert NewsletterSubscriber if opt-in
    ├── insert (or refresh) FreebieRequest (email, freebieId, token, expiresAt)
    └── IEmailSender.SendFreebieDownloadAsync(...)
        → Resend HTTP API   (or dev-noop if no key)
Inbox → click link
    ↓ GET /api/freebies/download/{token}
API
    ├── verify token, expiry, freebie published
    ├── stream file with Content-Disposition: attachment
    └── update DownloadCount / FirstDownloadedAt / LastDownloadedAt
```

Three new pieces: `Freebie` entity, `FreebieRequest` entity, `IEmailSender`
service. `ProductType.Freebie` and the `freebies` collection are retired.

## Data model

### `Freebie` (new table)

```csharp
public class Freebie
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = null!;          // unique
    public string Title { get; set; } = null!;
    public string Excerpt { get; set; } = null!;
    public List<string> Description { get; set; } = new();  // jsonb, paragraphs
    public string CoverImage { get; set; } = null!;     // /uploads/freebies/covers/…
    public string FilePath { get; set; } = null!;       // /uploads/freebies/files/…
    public string FileKind { get; set; } = null!;       // "pdf" | "zip"
    public long FileSizeBytes { get; set; }
    public int SortIndex { get; set; }
    public bool Published { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<FreebieRequest> Requests { get; set; } = new List<FreebieRequest>();
}
```

### `FreebieRequest` (new table — one row per email submission)

```csharp
public class FreebieRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FreebieId { get; set; }
    public Freebie Freebie { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Token { get; set; } = null!;          // 32-byte URL-safe random
    public DateTime ExpiresAt { get; set; }             // CreatedAt + 7d
    public bool OptedIntoNewsletter { get; set; }
    public int DownloadCount { get; set; }
    public DateTime? FirstDownloadedAt { get; set; }
    public DateTime? LastDownloadedAt { get; set; }
    public string? Ip { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

### Indexes

- `Freebies.Slug` — unique.
- `FreebieRequests.Token` — unique.
- `FreebieRequests.FreebieId` — fk index.
- `FreebieRequests.Email` — non-unique, supports admin lookup.

### Removed

- `Product.ProductType.Freebie` — left in enum with `[Obsolete]`, but no code
  emits it after migration.
- Seed: `mini-coloring-book` product row + the `freebies` collection row +
  `mini-coloring-book → freebies` association.

## API endpoints

### Public

| Method | Path | Body / Notes |
| --- | --- | --- |
| GET | `/api/freebies` | List published freebies, sorted by `SortIndex`. Returns `FreebieListItemDto`. |
| GET | `/api/freebies/{slug}` | Single freebie (published only). Returns `FreebieDto`. |
| POST | `/api/freebies/{slug}/request` | `{ email: string, optIn: boolean }`. Returns `{ ok: true }`. Rate-limited 5/min/IP/freebie via `IMemoryCache`. |
| GET | `/api/freebies/download/{token}` | Streams the file with `Content-Disposition: attachment`. On invalid/expired/unpublished, redirects to `/pages/freebies?download=invalid` or `?download=expired`. |

### Admin (auth-gated, mirrors existing admin controllers)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/freebies` | Paginated list incl. drafts. |
| POST | `/api/admin/freebies` | Create. Body: title, slug?, excerpt, description, published. Cover + file uploaded separately. |
| GET | `/api/admin/freebies/{slug}` | Edit-form payload. |
| PUT | `/api/admin/freebies/{slug}` | Update metadata. |
| DELETE | `/api/admin/freebies/{slug}` | Cascades `FreebieRequest`s and deletes files from disk. |
| POST | `/api/admin/freebies/{slug}/cover` | Multipart upload, saves to `/uploads/freebies/covers/`. |
| POST | `/api/admin/freebies/{slug}/file` | Multipart upload, `.pdf` or `.zip`, ≤ 15 MB. Saves to `/uploads/freebies/files/`. Replaces previous file (old deleted). |
| POST | `/api/admin/freebies/reorder` | Body: `[{ slug, sortIndex }]`. |
| GET | `/api/admin/freebies/{slug}/requests` | Paginated; columns from `FreebieRequest`. |
| POST | `/api/admin/freebies/{slug}/requests/{id}/resend` | Generates a fresh token, sends a new email. |

### DTOs

```csharp
public record FreebieListItemDto(
    string Slug, string Title, string Excerpt, string CoverImage,
    string FileKind, long FileSizeBytes);

public record FreebieDto(
    string Slug, string Title, string Excerpt, List<string> Description,
    string CoverImage, string FileKind, long FileSizeBytes);

public record FreebieRequestCreate(string Email, bool OptIn);
```

## Admin UX (`/admin/freebies`)

Replaces the current placeholder.

### List view

- Drag-sortable table (`SortIndex` persisted).
- Columns: cover thumb · title · slug · file (kind + size) · published toggle ·
  request count · last requested · actions.
- Top-right: **+ New freebie** button.
- Filter chips: All / Published / Drafts.
- Reuses `AdminTable`, `AdminPageHeader`, `AdminToolbar`.

### Edit view (`/admin/freebies/{slug}`)

Single form, mirrors `ProductForm`:

1. **Header card** — title · slug (auto from title, editable) · published toggle.
2. **Cover image** — `ImageUpload` → `/api/admin/freebies/{slug}/cover`.
3. **Excerpt** (single line, 140 chars) + **Description** (paragraphs, reuses
   `ContentBlockEditor` pattern).
4. **Downloadable file** — drop zone (`.pdf, .zip`, 15 MB cap). Shows current
   kind + size + admin-only "Download a copy" link. Replace = upload new; old
   file deleted on save.
5. **Requests panel** (read-only, paginated) — email · submitted at · opt-in ·
   downloads · last download · **Resend link** button.
6. Save / Delete at the bottom (Delete confirms; cascades requests + files).

### Sidebar

"Site content → Freebies" — existing entry, relinked to the new page.

### Static page header

The `StaticPageHeaderEditor slug="freebies"` block on the existing admin page
is preserved — it still drives the heading + intro copy above the grid on
`/pages/freebies`.

## Storefront UX

### `/pages/freebies`

- Top: page header (title + intro from `StaticPage` slug=`freebies`) —
  unchanged.
- Below: `<FreebieGrid>` — 3-column responsive grid of `<FreebieCard>`s.
- No `ProductCard`, no `/products/{slug}` link anywhere on this page.

### `<FreebieCard>`

- Cover image (4:3, lazy).
- Title + excerpt.
- Pill: "PDF" or "ZIP" + file size.
- Button: **"Get for free →"** — opens `<EmailGateModal>` for that freebie.
  No navigation.
- Whole card is the button's hit-area, with the button as the focusable target.

### `<EmailGateModal>`

Three states within one focus-trapped `<dialog>`:

1. **Form**
   - Cover thumbnail + title + short description.
   - Email input (validated client + server).
   - Checkbox: *"Send me future colouring freebies and updates"* — pre-checked.
   - Privacy note: "We only use your email to send the download link" + link
     to privacy page.
   - Primary: **Send me the link**. Secondary: Cancel.
   - On submit → `POST /api/freebies/{slug}/request`.
2. **Success**
   - "Check your inbox at `you@example.com` — the download link is on its way."
   - Subtext: "Didn't arrive in 5 minutes? Check spam, or **[resend]**." Resend
     re-submits the same email; backend dedupes by refreshing the active
     token.
   - **Close** button.
3. **Error**
   - Inline error message + **Retry** button.

### A11y + UX

- `Esc` closes the modal; focus returns to the originating card.
- Submit button shows a spinner; disabled while in flight.
- Server returns 429 if rate-limited → modal shows "Slow down — try again in
  a minute."

### Download link

`GET /api/freebies/download/{token}` directly streams the file with
`Content-Disposition: attachment; filename="<title-slug>.<kind>"`. No
intermediate landing page.

Errors redirect to `/pages/freebies?download=expired` or
`?download=invalid`; the page shows a banner above the grid based on the
query string.

## Email + token flow

### Resend integration

- Service: `IEmailSender` with
  `Task SendFreebieDownloadAsync(string to, Freebie f, string downloadUrl, CancellationToken ct)`.
- Concrete: `ResendEmailSender` — `POST https://api.resend.com/emails` with
  `Authorization: Bearer ${Resend__ApiKey}`.
- Dev-noop: if `Resend__ApiKey` is null/empty, log the payload at `Information`
  level and return success — the flow stays end-to-end testable without a
  real key.
- DI: `builder.Services.AddHttpClient<IEmailSender, ResendEmailSender>();`

### Configuration

`apps/api/appsettings.json` + `.env` placeholders:

```
Resend__ApiKey=
Resend__FromAddress=hello@jovie-joy.local
Resend__FromName=Jovie Joy
Freebies__DownloadTtlDays=7
Freebies__MaxFileSizeMb=15
Freebies__BaseUrl=http://localhost:8080
```

### Email template

- Inline-styled HTML + plain-text fallback. No external CSS, no remote
  images apart from the cover.
- Subject: `Your free download — {Freebie.Title}`
- Body: cover thumbnail, title, one-line description, big **Download your file**
  button → `{Freebies__BaseUrl}/api/freebies/download/{token}`, note that the
  link expires in 7 days, footer with unsubscribe link
  (`/pages/freebies?unsubscribe={email}`).

### Token generation

- `RandomNumberGenerator.GetBytes(32)` → `Base64UrlEncode` (~43 chars).
- Stored verbatim in `FreebieRequest.Token` with a unique index. No hashing —
  short-lived, single-purpose, not credentials.

### `POST /api/freebies/{slug}/request` semantics

1. Validate email (regex + non-empty).
2. Rate-limit 5/min/IP/freebie via `IMemoryCache` (matches `NewsletterController`).
3. Load freebie by slug; 404 if missing or unpublished.
4. **Dedupe**: if a non-expired `FreebieRequest` already exists for
   `(email, freebieId)`, refresh `ExpiresAt = now + TTL` and regenerate the
   token. Avoids inbox spam on accidental double-submits.
5. If `optIn` → upsert `NewsletterSubscriber`.
6. `await` the `IEmailSender` call — Resend is fast and a failure should
   surface as 502 so the modal can offer retry.
7. Response: `{ ok: true }`. Never echo the token.

### `GET /api/freebies/download/{token}` semantics

1. Look up `FreebieRequest` by token. Missing → redirect to
   `/pages/freebies?download=invalid`.
2. `ExpiresAt < now` → redirect to `?download=expired`.
3. Freebie unpublished or deleted → `?download=expired` (intentionally vague —
   don't leak state).
4. Stream the file from the absolute path derived from `FilePath` with
   `Content-Disposition: attachment; filename="{slugified title}.{kind}"`.
5. Update `DownloadCount`, `FirstDownloadedAt` (if null), `LastDownloadedAt`.
6. No range / resume support in v1.

## Migration + cleanup

### EF migration (`AddFreebies`)

- Create `Freebies` + `FreebieRequests` tables with columns + indexes from
  "Data model" above.
- Backfill (raw SQL in `Up()`):

```sql
insert into "Freebies" (
    "Id","Slug","Title","Excerpt","Description","CoverImage",
    "FilePath","FileKind","FileSizeBytes","SortIndex","Published",
    "CreatedAt","UpdatedAt")
select
    "Id","Slug","Title","Excerpt","Description",
    coalesce("Images"->>0,''),
    coalesce("PdfPath",''),
    'pdf', 0, 0, true,
    "CreatedAt","UpdatedAt"
from "Products" where "ProductType" = 3;

delete from "ProductCollections"
    where "ProductId" in (select "Id" from "Products" where "ProductType" = 3);
delete from "Products" where "ProductType" = 3;
delete from "Collections" where "Slug" = 'freebies';
```

(The exact column-name casing depends on the existing snapshot; align with
the migration generator.)

### Seed updates

- Remove the `mini-coloring-book` block from `SeedProducts.cs`.
- Remove the `freebies` collection row and its association in
  `SeedCollections.cs`.
- New `SeedFreebies.cs` inserts one demo freebie (reusing the mini coloring
  book asset) so a fresh DB has something to render.
- `SeedPages.cs` keeps the `freebies` page row but rewrites `Blocks` to a real
  intro paragraph.
- `SeedNavigation.cs` unchanged.

### Code cleanup

- `app/(public)/pages/[slug]/page.tsx`: stop calling
  `getProductsForCollection("freebies")`; render `<FreebieGrid />` (server
  component fetching `/api/freebies`).
- Remove `ProductType.Freebie` from `AdminFormatPicker`, products list filter,
  and the existing `admin-format-picker.test.tsx`.
- Replace the placeholder `apps/web/src/app/admin/freebies/page.tsx` with the
  list view from § 3.

### Cache

- `/pages/freebies` is `force-dynamic` (or `revalidate = 60`). Admin save of
  a freebie → `revalidatePath("/pages/freebies")` via the existing pattern.

## Tests

### Web (vitest + RTL)

- `<EmailGateModal>` — form submit → success state; validation errors;
  opt-in default checked; resend in success state re-calls the endpoint.
- `<FreebieCard>` — renders no `/products/...` link; opens the modal on
  click; shows file kind + size.
- Page test: `/pages/freebies` renders `<FreebieGrid>` with the API payload
  and no product card.

### API (xunit)

- `POST /api/freebies/{slug}/request`:
  - Valid email + opt-in → row created, subscriber upserted, email sender
    called.
  - Second submit with same email reuses the row and regenerates the token.
  - Unpublished freebie → 404.
  - Rate-limit → 429 on the 6th request in a minute.
- `GET /api/freebies/download/{token}`:
  - Valid token → 200 with `Content-Disposition` attachment.
  - Expired token → 302 to `?download=expired`.
  - Unknown token → 302 to `?download=invalid`.
  - Updates `DownloadCount` and timestamps.

## Rollout

Single PR.

1. Migration + entities + DTOs.
2. API endpoints (anon + admin).
3. `IEmailSender` + Resend client + dev-noop fallback.
4. Admin pages (list + edit + requests panel).
5. Storefront page + modal + grid.
6. Seed updates + remove `mini-coloring-book` product.
7. Verify on `/pages/freebies`, run `npm run build` (per repo rule:
   `tsc --noEmit` misses ESLint errors that fail prod).
8. Commit + open PR.

## Open follow-ups (out of scope for this spec)

- Real Resend account + verified sending domain (DKIM/SPF).
- Functional unsubscribe handling (the link in the email currently only
  carries the email through to a placeholder page).
- Audit log for admin "Resend link" actions.
- Bulk export of `FreebieRequest` emails to CSV for promotion campaigns.
