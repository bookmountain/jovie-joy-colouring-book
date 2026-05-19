# Zoe&Book Overhaul — Phase 3: Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the cocoa-themed admin UI inside the Zoe&Book FE (Phase 2). Day-1 admin manages Products + Collections + typed ContentBlocks + Orders, all backed by the Phase 1 admin endpoints. A reusable `ImageUpload` widget powers all image-replacement flows (product images, collection hero, content block hero artwork, about section images via blocks).

**Architecture:** New `src/app/admin/` route tree with its own `layout.tsx` providing the cocoa sidebar + auth guard. Shared `lib/adminApi.ts` wraps `lib/api.ts` with bearer-token-by-default for every admin call. Shared `ImageUpload` component (drag-drop or click-to-pick, calls `POST /api/admin/uploads` or entity-specific upload routes). Pages live under `/admin/{login, , products, collections, content, orders}`.

**Tech Stack:** Next 15, React 19, Tailwind cocoa palette already in `globals.css`, shadcn-style components built inline (no shadcn dep added). Lucide icons for admin glyphs.

**Branch:** `overhaul/zoe-book`. Builds on Phase 1 + Phase 2 commits. After Phase 3 lands, branch is ready to merge to `main`.

**Prereqs:**
- Phase 1 BE running on `http://localhost:8080` with seeded admin user (`admin@joviejoy.com` / `changeme123` or `Admin__Email/Admin__Password` overrides).
- Phase 2 FE in `apps/web/` with `src/lib/api.ts`, `src/lib/auth.ts`, `src/state/site-store.tsx` already in place.

---

## File Structure

### New
```
apps/web/src/app/admin/
├── layout.tsx                              cocoa sidebar + auth guard
├── login/page.tsx                          admin email+password sign-in
├── page.tsx                                dashboard (analytics summary)
├── products/
│   ├── page.tsx                            list + create
│   └── [slug]/page.tsx                     edit form (rich fields)
├── collections/
│   ├── page.tsx                            list + create
│   └── [slug]/page.tsx                     edit (drag-to-reorder products)
├── content/
│   ├── page.tsx                            grouped list of ContentBlocks
│   └── [key]/page.tsx                      typed editor per block
├── orders/page.tsx                         paginated list + status filter

apps/web/src/components/admin/
├── AdminShell.tsx                          sidebar layout shared by every page
├── ImageUpload.tsx                         reusable upload widget
├── ProductForm.tsx                         rich-fields create/edit form
├── CollectionForm.tsx                      collection edit form
├── ContentBlockEditor.tsx                  switchboard for block types
├── ContentBlockHomeHero.tsx                per-type editor
├── ContentBlockAnnouncement.tsx
├── ContentBlockHomeVideo.tsx
├── ContentBlockHeroArtwork.tsx
├── ContentBlockAboutSection.tsx
├── ContentBlockFaqEntry.tsx
├── ContentBlockFooterGroup.tsx
├── ContentBlockFeaturedOn.tsx
├── OrdersTable.tsx                         pagination + status filter
├── AnalyticsCards.tsx                      revenue cards + 30d chart
└── AdminAuthGuard.tsx                      redirects to /admin/login when missing token

apps/web/src/lib/adminApi.ts                bearer-by-default admin REST client
apps/web/src/state/admin-auth.tsx           admin session context (current user + token)
```

### Modified
```
apps/web/src/lib/auth.ts                    add adminLoginWithPassword(email, password)
apps/web/src/components/auth/UserMenu.tsx   already shows "Admin" link when role=admin (Phase 2)
apps/web/src/app/admin/login/page.tsx       new — separate from /login (Phase 2 modal)
README.md                                   admin section
```

### Untouched
```
apps/web/src/{app/(everything-else), components/(commerce|content|layout|overlays|providers)}/  Phase 2 storefront unchanged
apps/api/                                   Phase 1 BE unchanged (endpoints already in place)
```

---

## Phase A — Admin shell + auth (Tasks 1–4)

### Task 1: `lib/adminApi.ts` — admin REST client with bearer default

**Files:**
- Create: `apps/web/src/lib/adminApi.ts`
- Modify: `apps/web/src/lib/auth.ts` (add `adminLoginWithPassword`)

- [ ] **Step 1: Modify `apps/web/src/lib/auth.ts`** — append:

```typescript
import { API_URL } from "@/lib/api";

export async function adminLoginWithPassword(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Login failed (${res.status})`);
  }
  const json = (await res.json()) as { token: string; user: { isAdmin: boolean } };
  if (!json.user.isAdmin) throw new Error("Not an admin account");
  tokenStorage.write(json.token);
  return json.token;
}
```

- [ ] **Step 2: Create `apps/web/src/lib/adminApi.ts`**

```typescript
"use client";

import { API_URL, type Product, type Collection, type ContentBlock } from "@/lib/api";
import { tokenStorage } from "@/lib/auth";

function requireToken(): string {
  const t = tokenStorage.read();
  if (!t) throw new Error("Not authenticated");
  return t;
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${requireToken()}`);
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store", ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Products
export const adminListProducts = () => adminFetch<Product[]>("/api/admin/products");
export const adminGetProduct = (slug: string) => adminFetch<Product>(`/api/admin/products/${slug}`);
export const adminCreateProduct = (body: AdminProductWriteBody) =>
  adminFetch<Product>("/api/admin/products", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateProduct = (slug: string, body: AdminProductWriteBody) =>
  adminFetch<Product>(`/api/admin/products/${slug}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteProduct = (slug: string) =>
  adminFetch<void>(`/api/admin/products/${slug}`, { method: "DELETE" });
export const adminUploadProductImage = (slug: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<{ url: string }>(`/api/admin/products/${slug}/images`, { method: "POST", body: fd });
};
export const adminUploadProductPdf = (slug: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<Product>(`/api/admin/products/${slug}/pdf`, { method: "POST", body: fd });
};

// Collections
export const adminListCollections = () => adminFetch<Collection[]>("/api/admin/collections");
export const adminGetCollection = (slug: string) => adminFetch<Collection>(`/api/admin/collections/${slug}`);
export const adminCreateCollection = (body: AdminCollectionWriteBody) =>
  adminFetch<Collection>("/api/admin/collections", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateCollection = (slug: string, body: AdminCollectionWriteBody) =>
  adminFetch<Collection>(`/api/admin/collections/${slug}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteCollection = (slug: string) =>
  adminFetch<void>(`/api/admin/collections/${slug}`, { method: "DELETE" });
export const adminUploadCollectionHero = (slug: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<{ url: string }>(`/api/admin/collections/${slug}/hero-image`, { method: "POST", body: fd });
};

// Content blocks
export const adminListContent = () => adminFetch<ContentBlock[]>("/api/admin/content");
export const adminGetContent = (key: string) => adminFetch<ContentBlock>(`/api/admin/content/${key}`);
export const adminUpsertContent = (key: string, body: { type: string; data: unknown; sortIndex: number }) =>
  adminFetch<ContentBlock>(`/api/admin/content/${key}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteContent = (key: string) =>
  adminFetch<void>(`/api/admin/content/${key}`, { method: "DELETE" });
export const adminUploadContentImage = (key: string, file: File) => {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<{ url: string }>(`/api/admin/content/${key}/image`, { method: "POST", body: fd });
};

// General upload (used when no entity yet)
export const adminUploadGeneral = (file: File, folder?: string) => {
  const fd = new FormData();
  fd.append("file", file);
  if (folder) fd.append("folder", folder);
  return adminFetch<{ url: string }>("/api/admin/uploads", { method: "POST", body: fd });
};

// Orders + analytics
export type AdminOrder = {
  id: string; email: string; status: string;
  totalCents: number; createdAt: string; paidAt: string | null;
  items: { productSlug: string; title: string; qty: number; unitPriceCents: number }[];
};
export const adminListOrders = (status?: string, page = 1, pageSize = 20) => {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  q.set("page", String(page)); q.set("pageSize", String(pageSize));
  return adminFetch<{ items: AdminOrder[]; total: number; page: number; pageSize: number }>(
    `/api/admin/analytics/orders?${q}`,
  );
};
export const adminAnalyticsSummary = () =>
  adminFetch<{
    totalOrders: number; paidOrders: number; totalRevenueCents: number;
    revenueThisMonthCents: number; ordersThisMonth: number;
    last30Days: { date: string; revenueCents: number; orders: number }[];
    topProducts: { productSlug: string; title: string; unitsSold: number; revenueCents: number }[];
  }>("/api/admin/analytics/summary");

// Write request shapes (match Phase 1 AdminDtos)
export type AdminProductWriteBody = {
  slug?: string; title: string; excerpt: string; description: string[];
  priceCents: number; compareAtPriceCents: number | null; available: boolean;
  productType: string; images: string[];
  options: { name: string; values: string[] }[];
  sourceLinks: { label: string; href: string; image?: string; alt?: string }[] | null;
  reviewImages: string[] | null; inspirationImages: string[] | null;
  tags: string[]; collectionSlugs: string[];
  publishedAt?: string | null;
};

export type AdminCollectionWriteBody = {
  slug?: string; title: string; excerpt: string; heroImage: string | null;
  defaultSort: string; homepageSlot: string | null;
  productOrder: string[]; sortIndex: number;
};
```

- [ ] **Step 3: Verify build + commit**

```bash
cd apps/web && npx tsc --noEmit
git add apps/web/src/lib/adminApi.ts apps/web/src/lib/auth.ts
git commit -m "feat(admin): admin REST client + admin password login"
```

---

### Task 2: `state/admin-auth.tsx` — admin session context

**Files:**
- Create: `apps/web/src/state/admin-auth.tsx`

- [ ] **Step 1: Create the context**

```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCurrentUser, signOut as authSignOut } from "@/lib/auth";
import type { UserDto } from "@/lib/api";

type AdminAuthValue = {
  user: UserDto | null;
  status: "loading" | "ready";
  signOut: () => void;
};

const Ctx = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      setUser(u);
      setStatus("ready");
    });
  }, []);

  return (
    <Ctx.Provider value={{ user, status, signOut: () => authSignOut("/admin/login") }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminAuth must be inside AdminAuthProvider");
  return v;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/state/admin-auth.tsx
git commit -m "feat(admin): admin session context"
```

---

### Task 3: `components/admin/AdminAuthGuard.tsx` + `AdminShell.tsx`

**Files:**
- Create: `apps/web/src/components/admin/AdminAuthGuard.tsx`
- Create: `apps/web/src/components/admin/AdminShell.tsx`

- [ ] **Step 1: Create the guard**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuth } from "@/state/admin-auth";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, status } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "/admin";

  useEffect(() => {
    if (status === "ready" && (!user || !user.isAdmin) && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
  }, [user, status, pathname, router]);

  if (status === "loading") return <div className="p-8">Loading…</div>;
  if (pathname === "/admin/login") return <>{children}</>;
  if (!user || !user.isAdmin) return null;
  return <>{children}</>;
}
```

- [ ] **Step 2: Create the shell**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/state/admin-auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/orders", label: "Orders" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { user, signOut } = useAdminAuth();

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-cocoa-cream">
      <aside className="hidden w-60 shrink-0 border-r border-cocoa-line bg-white px-5 py-6 lg:block">
        <Link href="/admin" className="mb-8 block text-xl font-extrabold text-cocoa-ink">
          Zoe&amp;Book Admin
        </Link>
        <nav className="space-y-1">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`block rounded-coco-sm px-3 py-2 text-sm ${
                  active ? "bg-cocoa-honey font-bold text-cocoa-ink" : "text-cocoa-text hover:bg-cocoa-cream"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-cocoa-line bg-white px-6 py-3">
          <div className="lg:hidden text-lg font-bold">Zoe&amp;Book Admin</div>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="text-cocoa-text">{user?.email}</span>
            <button onClick={signOut} className="text-cocoa-coral underline">Sign out</button>
          </div>
        </header>
        <main className="p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/AdminAuthGuard.tsx apps/web/src/components/admin/AdminShell.tsx
git commit -m "feat(admin): auth guard + cocoa-themed sidebar shell"
```

---

### Task 4: `app/admin/layout.tsx` + `app/admin/login/page.tsx`

**Files:**
- Create: `apps/web/src/app/admin/layout.tsx`
- Create: `apps/web/src/app/admin/login/page.tsx`

- [ ] **Step 1: Create the layout**

```tsx
import type { Metadata } from "next";
import { AdminAuthProvider } from "@/state/admin-auth";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Zoe&Book Admin",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminAuthGuard>
        <AdminShell>{children}</AdminShell>
      </AdminAuthGuard>
    </AdminAuthProvider>
  );
}
```

- [ ] **Step 2: Create the login page**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLoginWithPassword } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      await adminLoginWithPassword(email.trim(), password);
      window.location.assign("/admin"); // hard reload so AdminAuthProvider picks up the new token
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cocoa-cream">
      <form onSubmit={handleSubmit} className="coco-panel w-full max-w-sm p-8">
        <h1 className="coco-heading mb-6">Admin sign in</h1>
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-semibold">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="coco-input w-full" />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-semibold">Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="coco-input w-full" />
        </label>
        {error && <p className="mb-3 text-sm text-cocoa-coral">{error}</p>}
        <button type="submit" disabled={submitting} className="coco-button-primary w-full">
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Build + smoke**

```bash
cd apps/web && npx tsc --noEmit && npm run dev &
sleep 8
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/login
kill %1 2>/dev/null || true
```

Expected: `200`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin
git commit -m "feat(admin): admin layout + login page"
```

---

## Phase B — Reusable widgets (Tasks 5–6)

### Task 5: `components/admin/ImageUpload.tsx` — single-file upload widget

**Files:**
- Create: `apps/web/src/components/admin/ImageUpload.tsx`

A drop-and-pick widget that calls a caller-provided upload function and reports back the resulting URL. Used by ProductForm, CollectionForm, ContentBlockEditor.

- [ ] **Step 1: Create the widget**

```tsx
"use client";

import { useRef, useState } from "react";

export type ImageUploadProps = {
  value?: string | null;            // current URL
  onChange: (url: string | null) => void;
  upload: (file: File) => Promise<{ url: string }>;  // caller-provided
  label?: string;
  accept?: string;
};

export function ImageUpload({ value, onChange, upload, label, accept = "image/*" }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(file: File) {
    setError(null); setBusy(true);
    try {
      const { url } = await upload(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-2">
      {label && <span className="block text-sm font-semibold">{label}</span>}
      <div className="flex items-start gap-4">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Uploaded asset" className="h-24 w-24 rounded-coco-sm border border-cocoa-line object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-coco-sm border border-dashed border-cocoa-line text-xs text-cocoa-text">
            No image
          </div>
        )}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="coco-button-secondary"
          >
            {busy ? "Uploading…" : value ? "Replace" : "Upload"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="block text-xs text-cocoa-coral underline">
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handlePick(f);
          e.target.value = ""; // allow re-uploading the same file
        }}
      />
      {error && <p className="text-xs text-cocoa-coral">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/admin/ImageUpload.tsx
git commit -m "feat(admin): reusable single-file ImageUpload widget"
```

---

### Task 6: `components/admin/MultiImageUpload.tsx` — for product images list

**Files:**
- Create: `apps/web/src/components/admin/MultiImageUpload.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useRef, useState } from "react";

export type MultiImageUploadProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  upload: (file: File) => Promise<{ url: string }>;
  label?: string;
};

export function MultiImageUpload({ value, onChange, upload, label }: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(files: FileList) {
    setError(null); setBusy(true);
    try {
      const next: string[] = [...value];
      for (const f of Array.from(files)) {
        const { url } = await upload(f);
        next.push(url);
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally { setBusy(false); }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function move(idx: number, delta: number) {
    const next = [...value];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {label && <span className="block text-sm font-semibold">{label}</span>}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((url, idx) => (
          <div key={`${url}-${idx}`} className="group relative rounded-coco-sm border border-cocoa-line bg-white p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="aspect-square w-full rounded-sm object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-cocoa-ink/70 p-1 text-[10px] text-cocoa-cream opacity-0 group-hover:opacity-100">
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}>←</button>
              <button type="button" onClick={() => remove(idx)} className="text-cocoa-coral">×</button>
              <button type="button" onClick={() => move(idx, 1)} disabled={idx === value.length - 1}>→</button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex aspect-square items-center justify-center rounded-coco-sm border border-dashed border-cocoa-line text-xs text-cocoa-text hover:bg-cocoa-cream"
        >
          {busy ? "Uploading…" : "+ Add"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const fs = e.target.files;
          if (fs && fs.length > 0) void handlePick(fs);
          e.target.value = "";
        }}
      />
      {error && <p className="text-xs text-cocoa-coral">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/admin/MultiImageUpload.tsx
git commit -m "feat(admin): MultiImageUpload widget with reorder + remove"
```

---

## Phase C — Dashboard + Orders (Tasks 7–8)

### Task 7: `app/admin/page.tsx` + `components/admin/AnalyticsCards.tsx`

**Files:**
- Create: `apps/web/src/app/admin/page.tsx`
- Create: `apps/web/src/components/admin/AnalyticsCards.tsx`

- [ ] **Step 1: Create `AnalyticsCards.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { adminAnalyticsSummary } from "@/lib/adminApi";
import { formatCents } from "@/lib/format";

type Summary = Awaited<ReturnType<typeof adminAnalyticsSummary>>;

export function AnalyticsCards() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminAnalyticsSummary().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-cocoa-coral">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const cards = [
    { label: "Revenue (all-time)", value: formatCents(data.totalRevenueCents) },
    { label: "Revenue (this month)", value: formatCents(data.revenueThisMonthCents) },
    { label: "Orders (this month)", value: String(data.ordersThisMonth) },
    { label: "Paid orders", value: String(data.paidOrders) },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="coco-panel p-5">
            <div className="text-sm text-cocoa-text">{c.label}</div>
            <div className="mt-1 text-2xl font-extrabold text-cocoa-ink">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="coco-panel p-6">
        <h2 className="mb-4 text-lg font-bold">Last 30 days</h2>
        {data.last30Days.length === 0 ? (
          <p className="text-cocoa-text">No paid orders in the last 30 days.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-cocoa-text">
                <th className="py-2">Date</th><th className="py-2">Orders</th><th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.last30Days.map((d) => (
                <tr key={d.date} className="border-t border-cocoa-line">
                  <td className="py-2">{d.date}</td>
                  <td className="py-2">{d.orders}</td>
                  <td className="py-2 text-right">{formatCents(d.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="coco-panel p-6">
        <h2 className="mb-4 text-lg font-bold">Top products</h2>
        {data.topProducts.length === 0 ? (
          <p className="text-cocoa-text">No sales yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-cocoa-text">
                <th className="py-2">Title</th><th className="py-2">Units</th><th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p) => (
                <tr key={p.productSlug} className="border-t border-cocoa-line">
                  <td className="py-2">{p.title}</td>
                  <td className="py-2">{p.unitsSold}</td>
                  <td className="py-2 text-right">{formatCents(p.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/admin/page.tsx`**

```tsx
import { AnalyticsCards } from "@/components/admin/AnalyticsCards";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="coco-heading mb-6">Dashboard</h1>
      <AnalyticsCards />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/admin/page.tsx apps/web/src/components/admin/AnalyticsCards.tsx
git commit -m "feat(admin): dashboard with analytics summary + last 30 days"
```

---

### Task 8: `app/admin/orders/page.tsx` + `components/admin/OrdersTable.tsx`

**Files:**
- Create: `apps/web/src/app/admin/orders/page.tsx`
- Create: `apps/web/src/components/admin/OrdersTable.tsx`

- [ ] **Step 1: Create `OrdersTable.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { adminListOrders, type AdminOrder } from "@/lib/adminApi";
import { formatCents } from "@/lib/format";

const STATUSES = ["", "pending", "paid", "failed", "refunded"];

export function OrdersTable() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: AdminOrder[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    adminListOrders(status || undefined, page, 20).then(setData).catch((e: Error) => setError(e.message));
  }, [status, page]);

  if (error) return <p className="text-cocoa-coral">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold">Status</label>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="coco-input">
          {STATUSES.map((s) => (<option key={s} value={s}>{s || "All"}</option>))}
        </select>
        <span className="ml-auto text-sm text-cocoa-text">{data.total} orders</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cocoa-line text-left text-cocoa-text">
            <th className="py-2">Created</th>
            <th className="py-2">Email</th>
            <th className="py-2">Status</th>
            <th className="py-2 text-right">Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((o) => (
            <>
              <tr key={o.id} className="border-b border-cocoa-line">
                <td className="py-2">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="py-2">{o.email}</td>
                <td className="py-2">{o.status}</td>
                <td className="py-2 text-right">{formatCents(o.totalCents)}</td>
                <td className="py-2 text-right">
                  <button onClick={() => setExpanded(expanded === o.id ? null : o.id)} className="text-cocoa-purple underline">
                    {expanded === o.id ? "Hide" : "Items"}
                  </button>
                </td>
              </tr>
              {expanded === o.id && (
                <tr key={`${o.id}-items`} className="bg-cocoa-cream/50">
                  <td colSpan={5} className="py-2 px-4">
                    <ul className="space-y-1 text-xs">
                      {o.items.map((i, idx) => (
                        <li key={idx}>
                          <code className="font-mono">{i.productSlug}</code> · {i.title} × {i.qty} · {formatCents(i.unitPriceCents)}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="coco-button-secondary disabled:opacity-50">Prev</button>
        <span className="text-sm">Page {page} / {lastPage}</span>
        <button onClick={() => setPage(Math.min(lastPage, page + 1))} disabled={page === lastPage} className="coco-button-secondary disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/admin/orders/page.tsx`**

```tsx
import { OrdersTable } from "@/components/admin/OrdersTable";

export default function AdminOrdersPage() {
  return (
    <div>
      <h1 className="coco-heading mb-6">Orders</h1>
      <OrdersTable />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/admin/orders apps/web/src/components/admin/OrdersTable.tsx
git commit -m "feat(admin): orders table with status filter + line-item drill-down"
```

---

## Phase D — Products admin (Tasks 9–11)

### Task 9: `components/admin/ProductForm.tsx`

**Files:**
- Create: `apps/web/src/components/admin/ProductForm.tsx`

- [ ] **Step 1: Create the form**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/api";
import {
  adminListCollections, adminUploadProductImage, adminUploadGeneral,
  type AdminProductWriteBody,
} from "@/lib/adminApi";
import { MultiImageUpload } from "@/components/admin/MultiImageUpload";

const PRODUCT_TYPES = ["physical", "digital", "sticker", "freebie"] as const;

type Props = {
  initial?: Product;                                  // undefined → create mode
  onSubmit: (body: AdminProductWriteBody) => Promise<void>;
  submitLabel: string;
};

export function ProductForm({ initial, onSubmit, submitLabel }: Props) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [description, setDescription] = useState(initial?.description.join("\n\n") ?? "");
  const [priceCents, setPriceCents] = useState(initial?.priceCents ?? 0);
  const [compareCents, setCompareCents] = useState(initial?.compareAtPriceCents ?? 0);
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [productType, setProductType] = useState<string>(initial?.productType ?? "physical");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [collectionSlugs, setCollectionSlugs] = useState<string[]>(initial?.collections ?? []);
  const [publishedAt, setPublishedAt] = useState(initial?.publishedAt?.slice(0, 10) ?? "");

  const [allCollections, setAllCollections] = useState<{ slug: string; title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminListCollections().then((cs) => setAllCollections(cs.map((c) => ({ slug: c.slug, title: c.title }))));
  }, []);

  // Use entity-scoped upload only when editing; for new products, upload to /uploads first and store the URL
  const uploadImage = initial
    ? (file: File) => adminUploadProductImage(initial.slug, file)
    : (file: File) => adminUploadGeneral(file, "products");

  function toggleCollection(slug: string) {
    setCollectionSlugs((cs) => (cs.includes(slug) ? cs.filter((s) => s !== slug) : [...cs, slug]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      const body: AdminProductWriteBody = {
        slug: initial ? undefined : slug,
        title, excerpt,
        description: description.split(/\n\n+/).map((s) => s.trim()).filter(Boolean),
        priceCents: Number(priceCents),
        compareAtPriceCents: Number(compareCents) > 0 ? Number(compareCents) : null,
        available,
        productType,
        images,
        options: initial?.options ?? [{ name: "Format", values: ["Default Title"] }],
        sourceLinks: initial?.sourceLinks ?? null,
        reviewImages: initial?.reviewImages ?? null,
        inspirationImages: initial?.inspirationImages ?? null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        collectionSlugs,
        publishedAt: publishedAt || null,
      };
      await onSubmit(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="coco-panel p-6 space-y-4">
        {!initial && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Slug</span>
            <input required value={slug} onChange={(e) => setSlug(e.target.value)} className="coco-input w-full" />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Title</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="coco-input w-full" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Excerpt</span>
          <textarea required value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="coco-input w-full" rows={2} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Description (separate paragraphs with blank lines)</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="coco-input w-full" rows={6} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            <span className="mb-1 block text-sm font-semibold">Price (cents)</span>
            <input type="number" min={0} required value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value))} className="coco-input w-full" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold">Compare-at (cents)</span>
            <input type="number" min={0} value={compareCents} onChange={(e) => setCompareCents(Number(e.target.value))} className="coco-input w-full" />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold">Product type</span>
            <select value={productType} onChange={(e) => setProductType(e.target.value)} className="coco-input w-full">
              {PRODUCT_TYPES.map((t) => (<option key={t}>{t}</option>))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          <span className="text-sm font-semibold">Available</span>
        </label>
      </div>

      <div className="coco-panel p-6">
        <MultiImageUpload value={images} onChange={setImages} upload={uploadImage} label="Product images" />
      </div>

      <div className="coco-panel p-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Tags (comma-separated)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="coco-input w-full" />
        </label>
        <div>
          <span className="mb-2 block text-sm font-semibold">Collections</span>
          <div className="flex flex-wrap gap-2">
            {allCollections.map((c) => {
              const on = collectionSlugs.includes(c.slug);
              return (
                <button
                  key={c.slug} type="button" onClick={() => toggleCollection(c.slug)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    on ? "border-cocoa-ink bg-cocoa-ink text-cocoa-cream" : "border-cocoa-line bg-white text-cocoa-text"
                  }`}
                >
                  {c.title}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Published at</span>
          <input type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className="coco-input" />
        </label>
      </div>

      {error && <p className="text-cocoa-coral text-sm">{error}</p>}
      <button type="submit" disabled={submitting} className="coco-button-primary">
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/admin/ProductForm.tsx
git commit -m "feat(admin): product form with collections + tags + multi-image"
```

---

### Task 10: `app/admin/products/page.tsx` (list + create) + `app/admin/products/[slug]/page.tsx` (edit)

**Files:**
- Create: `apps/web/src/app/admin/products/page.tsx`
- Create: `apps/web/src/app/admin/products/[slug]/page.tsx`

- [ ] **Step 1: Create `app/admin/products/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateProduct, adminDeleteProduct, adminListProducts } from "@/lib/adminApi";
import type { Product } from "@/lib/api";
import { formatCents } from "@/lib/format";
import { ProductForm } from "@/components/admin/ProductForm";

export default function AdminProductsList() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function reload() {
    adminListProducts().then(setProducts).catch((e: Error) => setError(e.message));
  }
  useEffect(reload, []);

  async function handleDelete(slug: string) {
    if (!window.confirm(`Soft-delete ${slug}?`)) return;
    await adminDeleteProduct(slug);
    reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="coco-heading">Products</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="coco-button-primary">
          {showCreate ? "Cancel" : "+ New product"}
        </button>
      </div>

      {error && <p className="mt-3 text-cocoa-coral">{error}</p>}

      {showCreate && (
        <div className="mt-6">
          <ProductForm
            submitLabel="Create"
            onSubmit={async (body) => {
              const created = await adminCreateProduct(body);
              router.push(`/admin/products/${created.slug}`);
            }}
          />
        </div>
      )}

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-cocoa-line text-left text-cocoa-text">
            <th className="py-2">Title</th>
            <th className="py-2">Slug</th>
            <th className="py-2">Type</th>
            <th className="py-2">Price</th>
            <th className="py-2">Available</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.slug} className="border-b border-cocoa-line">
              <td className="py-2 font-semibold">{p.title}</td>
              <td className="py-2"><code className="text-xs">{p.slug}</code></td>
              <td className="py-2">{p.productType}</td>
              <td className="py-2">{formatCents(p.priceCents)}</td>
              <td className="py-2">{p.available ? "✓" : "—"}</td>
              <td className="py-2 text-right">
                <Link href={`/admin/products/${p.slug}`} className="mr-3 text-cocoa-purple underline">Edit</Link>
                <button onClick={() => handleDelete(p.slug)} className="text-cocoa-coral underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/admin/products/[slug]/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetProduct, adminUpdateProduct, adminUploadProductPdf } from "@/lib/adminApi";
import type { Product } from "@/lib/api";
import { ProductForm } from "@/components/admin/ProductForm";

export default function AdminProductEdit() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!params.slug) return;
    adminGetProduct(params.slug).then(setProduct).catch((e: Error) => setError(e.message));
  }, [params.slug]);

  async function handlePdfUpload() {
    if (!pdfFile || !product) return;
    setPdfBusy(true);
    try {
      const updated = await adminUploadProductPdf(product.slug, pdfFile);
      setProduct(updated);
      setPdfFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF upload failed");
    } finally { setPdfBusy(false); }
  }

  if (error) return <p className="text-cocoa-coral">{error}</p>;
  if (!product) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="coco-heading mb-6">{product.title}</h1>

      <ProductForm
        initial={product}
        submitLabel="Save changes"
        onSubmit={async (body) => {
          const updated = await adminUpdateProduct(product.slug, body);
          setProduct(updated);
          setSavedAt(new Date().toLocaleTimeString());
        }}
      />

      {savedAt && <p className="mt-3 text-sm text-cocoa-mint">Saved at {savedAt}</p>}

      <div className="coco-panel mt-8 p-6">
        <h2 className="mb-3 text-lg font-bold">PDF (digital fulfilment)</h2>
        {product.pdfPath && <p className="mb-3 text-sm">Current: <code>{product.pdfPath}</code></p>}
        <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
        <button onClick={handlePdfUpload} disabled={!pdfFile || pdfBusy} className="coco-button-secondary ml-3 disabled:opacity-50">
          {pdfBusy ? "Uploading…" : "Upload PDF"}
        </button>
      </div>

      <button onClick={() => router.push("/admin/products")} className="mt-8 text-sm underline">← Back to products</button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/admin/products
git commit -m "feat(admin): products list (create) + edit pages with PDF upload"
```

---

### Task 11: (reserved for product extras — skip unless edit page reveals missing fields)

The reference's reviewImages / inspirationImages / sourceLinks editors are out of scope for v1; the `ProductForm` carries them through unchanged via `initial?.X ?? null`. If editing them becomes important, add dedicated sub-forms in a follow-up.

---

## Phase E — Collections admin (Tasks 12–13)

### Task 12: `components/admin/CollectionForm.tsx`

**Files:**
- Create: `apps/web/src/components/admin/CollectionForm.tsx`

- [ ] **Step 1: Create the form**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Collection, Product } from "@/lib/api";
import { adminListProducts, adminUploadCollectionHero, adminUploadGeneral, type AdminCollectionWriteBody } from "@/lib/adminApi";
import { ImageUpload } from "@/components/admin/ImageUpload";

const SORT_KEYS = [
  "featured", "relevance", "bestselling",
  "titleascending", "titledescending",
  "priceascending", "pricedescending",
  "createdascending", "createddescending",
] as const;

const HOMEPAGE_SLOTS = ["", "newrelease", "bestseller", "digital", "tile"] as const;

type Props = {
  initial?: Collection;
  onSubmit: (body: AdminCollectionWriteBody) => Promise<void>;
  submitLabel: string;
};

export function CollectionForm({ initial, onSubmit, submitLabel }: Props) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [heroImage, setHeroImage] = useState<string | null>(initial?.heroImage ?? null);
  const [defaultSort, setDefaultSort] = useState<string>(initial?.defaultSort ?? "titleascending");
  const [homepageSlot, setHomepageSlot] = useState<string>(initial?.homepageSlot ?? "");
  const [sortIndex, setSortIndex] = useState(initial?.sortIndex ?? 0);
  const [productOrder, setProductOrder] = useState<string[]>(initial?.productSlugs ?? []);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminListProducts().then(setAllProducts).catch((e: Error) => setError(e.message));
  }, []);

  const uploadHero = initial
    ? (file: File) => adminUploadCollectionHero(initial.slug, file)
    : (file: File) => adminUploadGeneral(file, "collections");

  function toggleProduct(slug: string) {
    setProductOrder((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]));
  }
  function move(idx: number, delta: number) {
    const next = [...productOrder];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setProductOrder(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      const body: AdminCollectionWriteBody = {
        slug: initial ? undefined : slug,
        title, excerpt, heroImage,
        defaultSort, homepageSlot: homepageSlot || null,
        productOrder, sortIndex: Number(sortIndex),
      };
      await onSubmit(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="coco-panel p-6 space-y-4">
        {!initial && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Slug</span>
            <input required value={slug} onChange={(e) => setSlug(e.target.value)} className="coco-input w-full" />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Title</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="coco-input w-full" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Excerpt</span>
          <textarea required value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="coco-input w-full" />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            <span className="mb-1 block text-sm font-semibold">Default sort</span>
            <select value={defaultSort} onChange={(e) => setDefaultSort(e.target.value)} className="coco-input w-full">
              {SORT_KEYS.map((k) => (<option key={k}>{k}</option>))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold">Homepage slot</span>
            <select value={homepageSlot} onChange={(e) => setHomepageSlot(e.target.value)} className="coco-input w-full">
              {HOMEPAGE_SLOTS.map((s) => (<option key={s} value={s}>{s || "none"}</option>))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold">Sort index</span>
            <input type="number" value={sortIndex} onChange={(e) => setSortIndex(Number(e.target.value))} className="coco-input w-full" />
          </label>
        </div>
      </div>

      <div className="coco-panel p-6">
        <ImageUpload value={heroImage} onChange={setHeroImage} upload={uploadHero} label="Hero image" />
      </div>

      <div className="coco-panel p-6 space-y-3">
        <span className="block text-sm font-semibold">Products in this collection (in order)</span>
        <ol className="space-y-1 text-sm">
          {productOrder.map((slug, idx) => {
            const p = allProducts.find((pp) => pp.slug === slug);
            return (
              <li key={slug} className="flex items-center gap-2">
                <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</button>
                <button type="button" onClick={() => move(idx, 1)} disabled={idx === productOrder.length - 1}>↓</button>
                <span className="flex-1">{p?.title ?? slug}</span>
                <button type="button" onClick={() => toggleProduct(slug)} className="text-cocoa-coral">remove</button>
              </li>
            );
          })}
        </ol>
        <details>
          <summary className="cursor-pointer text-sm text-cocoa-purple">Add product</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {allProducts.filter((p) => !productOrder.includes(p.slug)).map((p) => (
              <button key={p.slug} type="button" onClick={() => toggleProduct(p.slug)}
                className="rounded-full border border-cocoa-line bg-white px-3 py-1 text-xs">
                {p.title}
              </button>
            ))}
          </div>
        </details>
      </div>

      {error && <p className="text-cocoa-coral text-sm">{error}</p>}
      <button type="submit" disabled={submitting} className="coco-button-primary">
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/admin/CollectionForm.tsx
git commit -m "feat(admin): collection form with hero upload + curated product order"
```

---

### Task 13: `app/admin/collections/page.tsx` + `app/admin/collections/[slug]/page.tsx`

**Files:**
- Create: `apps/web/src/app/admin/collections/page.tsx`
- Create: `apps/web/src/app/admin/collections/[slug]/page.tsx`

- [ ] **Step 1: Create the list page**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateCollection, adminDeleteCollection, adminListCollections } from "@/lib/adminApi";
import type { Collection } from "@/lib/api";
import { CollectionForm } from "@/components/admin/CollectionForm";

export default function AdminCollectionsList() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function reload() {
    adminListCollections().then(setCollections).catch((e: Error) => setError(e.message));
  }
  useEffect(reload, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="coco-heading">Collections</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="coco-button-primary">
          {showCreate ? "Cancel" : "+ New collection"}
        </button>
      </div>
      {error && <p className="mt-3 text-cocoa-coral">{error}</p>}
      {showCreate && (
        <div className="mt-6">
          <CollectionForm
            submitLabel="Create"
            onSubmit={async (body) => {
              const created = await adminCreateCollection(body);
              router.push(`/admin/collections/${created.slug}`);
            }}
          />
        </div>
      )}
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-cocoa-line text-left text-cocoa-text">
            <th className="py-2">Title</th><th className="py-2">Slug</th>
            <th className="py-2">Sort</th><th className="py-2">Slot</th>
            <th className="py-2">Products</th><th></th>
          </tr>
        </thead>
        <tbody>
          {collections.map((c) => (
            <tr key={c.slug} className="border-b border-cocoa-line">
              <td className="py-2 font-semibold">{c.title}</td>
              <td className="py-2"><code className="text-xs">{c.slug}</code></td>
              <td className="py-2">{c.defaultSort}</td>
              <td className="py-2">{c.homepageSlot ?? "—"}</td>
              <td className="py-2">{c.productSlugs.length}</td>
              <td className="py-2 text-right">
                <Link href={`/admin/collections/${c.slug}`} className="mr-3 text-cocoa-purple underline">Edit</Link>
                <button
                  onClick={async () => {
                    if (!window.confirm(`Delete ${c.slug}?`)) return;
                    await adminDeleteCollection(c.slug);
                    reload();
                  }}
                  className="text-cocoa-coral underline"
                >Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create the edit page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetCollection, adminUpdateCollection } from "@/lib/adminApi";
import type { Collection } from "@/lib/api";
import { CollectionForm } from "@/components/admin/CollectionForm";

export default function AdminCollectionEdit() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!params.slug) return;
    adminGetCollection(params.slug).then(setCollection).catch((e: Error) => setError(e.message));
  }, [params.slug]);

  if (error) return <p className="text-cocoa-coral">{error}</p>;
  if (!collection) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="coco-heading mb-6">{collection.title}</h1>
      <CollectionForm
        initial={collection}
        submitLabel="Save changes"
        onSubmit={async (body) => {
          const updated = await adminUpdateCollection(collection.slug, body);
          setCollection(updated);
          setSavedAt(new Date().toLocaleTimeString());
        }}
      />
      {savedAt && <p className="mt-3 text-sm text-cocoa-mint">Saved at {savedAt}</p>}
      <button onClick={() => router.push("/admin/collections")} className="mt-8 text-sm underline">← Back</button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/admin/collections
git commit -m "feat(admin): collections list (create) + edit pages"
```

---

## Phase F — Content admin (Tasks 14–16)

### Task 14: `components/admin/ContentBlockEditor.tsx` + per-type editors

**Files:**
- Create: `apps/web/src/components/admin/ContentBlockEditor.tsx`
- Create: `apps/web/src/components/admin/blocks/HomeHeroBlock.tsx`
- Create: `apps/web/src/components/admin/blocks/AnnouncementBlock.tsx`
- Create: `apps/web/src/components/admin/blocks/HomeVideoBlock.tsx`
- Create: `apps/web/src/components/admin/blocks/HeroArtworkBlock.tsx`

- [ ] **Step 1: Create `ContentBlockEditor.tsx` (dispatch by type)**

```tsx
"use client";

import type { ContentBlock } from "@/lib/api";
import { HomeHeroBlock } from "@/components/admin/blocks/HomeHeroBlock";
import { AnnouncementBlock } from "@/components/admin/blocks/AnnouncementBlock";
import { HomeVideoBlock } from "@/components/admin/blocks/HomeVideoBlock";
import { HeroArtworkBlock } from "@/components/admin/blocks/HeroArtworkBlock";

export type ContentBlockEditorProps = {
  blockKey: string;
  type: string;
  data: unknown;
  onChange: (data: unknown) => void;
};

export function ContentBlockEditor(props: ContentBlockEditorProps) {
  switch (props.type) {
    case "HomeHero": return <HomeHeroBlock {...props} />;
    case "Announcement": return <AnnouncementBlock {...props} />;
    case "HomeVideo": return <HomeVideoBlock {...props} />;
    case "HeroArtwork": return <HeroArtworkBlock {...props} />;
    // AboutSection / FaqEntry / FooterGroup / FeaturedOn: future v1.1
    default:
      return (
        <textarea
          className="coco-input w-full font-mono text-xs"
          rows={8}
          defaultValue={JSON.stringify(props.data, null, 2)}
          onChange={(e) => {
            try { props.onChange(JSON.parse(e.target.value)); }
            catch { /* user mid-edit; ignore */ }
          }}
        />
      );
  }
}
```

- [ ] **Step 2: Create `HomeHeroBlock.tsx`**

```tsx
"use client";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { adminUploadContentImage } from "@/lib/adminApi";
import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { eyebrow?: string; title?: string; subtext?: string; ctaLabel?: string; ctaHref?: string; image?: string };

export function HomeHeroBlock({ blockKey, data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <label className="block"><span className="mb-1 block text-sm font-semibold">Eyebrow</span>
        <input className="coco-input w-full" value={d.eyebrow ?? ""} onChange={(e) => onChange({ ...d, eyebrow: e.target.value })} />
      </label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">Title</span>
        <input className="coco-input w-full" value={d.title ?? ""} onChange={(e) => onChange({ ...d, title: e.target.value })} />
      </label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">Subtext</span>
        <textarea className="coco-input w-full" rows={3} value={d.subtext ?? ""} onChange={(e) => onChange({ ...d, subtext: e.target.value })} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="mb-1 block text-sm font-semibold">CTA label</span>
          <input className="coco-input w-full" value={d.ctaLabel ?? ""} onChange={(e) => onChange({ ...d, ctaLabel: e.target.value })} />
        </label>
        <label><span className="mb-1 block text-sm font-semibold">CTA href</span>
          <input className="coco-input w-full" value={d.ctaHref ?? ""} onChange={(e) => onChange({ ...d, ctaHref: e.target.value })} />
        </label>
      </div>
      <ImageUpload
        value={d.image ?? null}
        onChange={(url) => onChange({ ...d, image: url ?? undefined })}
        upload={(f) => adminUploadContentImage(blockKey, f)}
        label="Hero image"
      />
    </div>
  );
}
```

- [ ] **Step 3: Create `AnnouncementBlock.tsx`**

```tsx
"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { enabled?: boolean; text?: string; href?: string };

export function AnnouncementBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={d.enabled ?? false} onChange={(e) => onChange({ ...d, enabled: e.target.checked })} />
        <span className="text-sm font-semibold">Show announcement bar</span>
      </label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">Text</span>
        <input className="coco-input w-full" value={d.text ?? ""} onChange={(e) => onChange({ ...d, text: e.target.value })} />
      </label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">Href</span>
        <input className="coco-input w-full" value={d.href ?? ""} onChange={(e) => onChange({ ...d, href: e.target.value })} />
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Create `HomeVideoBlock.tsx`**

```tsx
"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { src?: string; youtubeHref?: string };

export function HomeVideoBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <label className="block"><span className="mb-1 block text-sm font-semibold">Video file URL (.mp4)</span>
        <input className="coco-input w-full" value={d.src ?? ""} onChange={(e) => onChange({ ...d, src: e.target.value })} />
      </label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">YouTube fallback URL</span>
        <input className="coco-input w-full" value={d.youtubeHref ?? ""} onChange={(e) => onChange({ ...d, youtubeHref: e.target.value })} />
      </label>
    </div>
  );
}
```

- [ ] **Step 5: Create `HeroArtworkBlock.tsx`**

```tsx
"use client";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { adminUploadContentImage } from "@/lib/adminApi";
import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { desktop?: string; mobile?: string };

export function HeroArtworkBlock({ blockKey, data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ImageUpload
        value={d.desktop ?? null}
        onChange={(url) => onChange({ ...d, desktop: url ?? undefined })}
        upload={(f) => adminUploadContentImage(`${blockKey}-desktop`, f)}
        label="Desktop image"
      />
      <ImageUpload
        value={d.mobile ?? null}
        onChange={(url) => onChange({ ...d, mobile: url ?? undefined })}
        upload={(f) => adminUploadContentImage(`${blockKey}-mobile`, f)}
        label="Mobile image"
      />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/admin/ContentBlockEditor.tsx apps/web/src/components/admin/blocks
git commit -m "feat(admin): typed editors for HomeHero, Announcement, HomeVideo, HeroArtwork"
```

---

### Task 15: `app/admin/content/page.tsx` (grouped list of ContentBlocks)

**Files:**
- Create: `apps/web/src/app/admin/content/page.tsx`

- [ ] **Step 1: Create the list**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminListContent, adminDeleteContent } from "@/lib/adminApi";
import type { ContentBlock } from "@/lib/api";

const ORDER = ["HomeHero", "Announcement", "HomeVideo", "HeroArtwork", "AboutSection", "FaqEntry", "FooterGroup", "FeaturedOn"];

export default function AdminContentPage() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    adminListContent().then(setBlocks).catch((e: Error) => setError(e.message));
  }
  useEffect(reload, []);

  if (error) return <p className="text-cocoa-coral">{error}</p>;

  const grouped = ORDER.map((type) => ({
    type,
    items: blocks.filter((b) => b.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="coco-heading">Content</h1>
        <Link href="/admin/content/new" className="coco-button-primary">+ New block</Link>
      </div>
      <p className="mt-2 text-sm text-cocoa-text">
        Typed blocks rendered on the storefront: hero, announcement, video, hero artwork.
        AboutSection, FaqEntry, FooterGroup, FeaturedOn types accept raw JSON for now.
      </p>

      {grouped.length === 0 ? (
        <p className="mt-6 text-cocoa-text">No content blocks yet.</p>
      ) : (
        grouped.map((g) => (
          <div key={g.type} className="mt-8">
            <h2 className="text-lg font-bold">{g.type}</h2>
            <ul className="mt-2 space-y-2">
              {g.items.map((b) => (
                <li key={b.key} className="flex items-center justify-between rounded-coco-sm border border-cocoa-line bg-white px-4 py-3">
                  <div>
                    <div className="font-semibold">{b.key}</div>
                    <div className="text-xs text-cocoa-text">Updated {new Date(b.updatedAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Link href={`/admin/content/${encodeURIComponent(b.key)}`} className="text-cocoa-purple underline">Edit</Link>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Delete ${b.key}?`)) return;
                        await adminDeleteContent(b.key);
                        reload();
                      }}
                      className="text-cocoa-coral underline"
                    >Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/admin/content/page.tsx
git commit -m "feat(admin): content blocks list grouped by type"
```

---

### Task 16: `app/admin/content/[key]/page.tsx` (per-block editor)

**Files:**
- Create: `apps/web/src/app/admin/content/[key]/page.tsx`
- Create: `apps/web/src/app/admin/content/new/page.tsx`

- [ ] **Step 1: Create the edit page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import type { ContentBlock } from "@/lib/api";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";

export default function AdminContentEditPage() {
  const params = useParams<{ key: string }>();
  const router = useRouter();
  const key = decodeURIComponent(params.key ?? "");
  const [block, setBlock] = useState<ContentBlock | null>(null);
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!key) return;
    adminGetContent(key).then((b) => { setBlock(b); setData(b.data); }).catch((e: Error) => setError(e.message));
  }, [key]);

  async function save() {
    if (!block) return;
    setError(null); setSubmitting(true);
    try {
      const updated = await adminUpsertContent(block.key, { type: block.type, data, sortIndex: block.sortIndex });
      setBlock(updated);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setSubmitting(false); }
  }

  if (error) return <p className="text-cocoa-coral">{error}</p>;
  if (!block) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="coco-heading">{block.key}</h1>
      <p className="mt-1 text-sm text-cocoa-text">Type: <code>{block.type}</code></p>

      <div className="coco-panel mt-6 p-6">
        <ContentBlockEditor blockKey={block.key} type={block.type} data={data} onChange={setData} />
      </div>

      {savedAt && <p className="mt-3 text-sm text-cocoa-mint">Saved at {savedAt}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={submitting} className="coco-button-primary">
          {submitting ? "Saving…" : "Save"}
        </button>
        <button onClick={() => router.push("/admin/content")} className="text-sm underline">← Back</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/admin/content/new/page.tsx` (create flow)**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";

const TYPES = ["HomeHero", "Announcement", "HomeVideo", "HeroArtwork", "AboutSection", "FaqEntry", "FooterGroup", "FeaturedOn"];

export default function AdminContentNew() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [sortIndex, setSortIndex] = useState(0);
  const [data, setData] = useState<unknown>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setError(null); setSubmitting(true);
    try {
      await adminUpsertContent(key, { type, data, sortIndex });
      router.push(`/admin/content/${encodeURIComponent(key)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="coco-heading mb-6">New content block</h1>
      <div className="coco-panel space-y-4 p-6">
        <label className="block"><span className="mb-1 block text-sm font-semibold">Key (e.g. <code>about.section.1</code>)</span>
          <input required value={key} onChange={(e) => setKey(e.target.value)} className="coco-input w-full" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="mb-1 block text-sm font-semibold">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="coco-input w-full">
              {TYPES.map((t) => (<option key={t}>{t}</option>))}
            </select>
          </label>
          <label><span className="mb-1 block text-sm font-semibold">Sort index</span>
            <input type="number" value={sortIndex} onChange={(e) => setSortIndex(Number(e.target.value))} className="coco-input w-full" />
          </label>
        </div>
      </div>

      <div className="coco-panel mt-6 p-6">
        <ContentBlockEditor blockKey={key || "new"} type={type} data={data} onChange={setData} />
      </div>

      {error && <p className="mt-3 text-sm text-cocoa-coral">{error}</p>}
      <button onClick={save} disabled={submitting || !key} className="coco-button-primary mt-4">
        {submitting ? "Creating…" : "Create"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/admin/content
git commit -m "feat(admin): content block edit + create with typed editors + image upload"
```

---

## Phase G — Tests + cutover (Tasks 17–19)

### Task 17: Vitest test — admin auth + ImageUpload smoke

**Files:**
- Create: `apps/web/src/state/admin-auth.test.tsx`
- Create: `apps/web/src/components/admin/ImageUpload.test.tsx`

- [ ] **Step 1: Create `admin-auth.test.tsx`**

```tsx
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminAuthProvider, useAdminAuth } from "@/state/admin-auth";

function Probe() {
  const { user, status } = useAdminAuth();
  return <div data-testid="probe">{status}-{user?.email ?? "none"}</div>;
}

beforeEach(() => {
  window.localStorage.setItem("zoe-book-token", "stub");
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ id: "u1", email: "admin@x.com", name: null, avatarUrl: null, isAdmin: true }), {
      status: 200, headers: { "content-type": "application/json" },
    })) as typeof fetch;
});
afterEach(() => { vi.restoreAllMocks(); window.localStorage.clear(); });

describe("AdminAuthProvider", () => {
  test("loads current user when token present", async () => {
    render(<AdminAuthProvider><Probe /></AdminAuthProvider>);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("ready-admin@x.com"));
  });
});
```

- [ ] **Step 2: Create `ImageUpload.test.tsx`**

```tsx
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImageUpload } from "@/components/admin/ImageUpload";

describe("ImageUpload", () => {
  test("calls upload and emits returned URL", async () => {
    const upload = vi.fn(async () => ({ url: "/uploads/x.png" }));
    const onChange = vi.fn();
    const { container } = render(<ImageUpload value={null} onChange={onChange} upload={upload} label="Hero" />);

    const file = new File(["x"], "x.png", { type: "image/png" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.change(input);

    await waitFor(() => {
      expect(upload).toHaveBeenCalledWith(file);
      expect(onChange).toHaveBeenCalledWith("/uploads/x.png");
    });
  });

  test("Remove clears value", () => {
    const onChange = vi.fn();
    render(<ImageUpload value="/uploads/existing.png" onChange={onChange} upload={vi.fn()} />);
    fireEvent.click(screen.getByText("Remove"));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd apps/web && npm test
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/state/admin-auth.test.tsx apps/web/src/components/admin/ImageUpload.test.tsx
git commit -m "test(admin): admin-auth provider + ImageUpload widget"
```

---

### Task 18: Playwright e2e — admin login → create product → upload image → edit collection

**Files:**
- Create: `apps/web/tests/admin-flow.spec.ts`

- [ ] **Step 1: Create the spec**

```typescript
import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@joviejoy.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "changeme123";

test.describe("admin flow", () => {
  test("login → list products → open content list", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("/admin");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();

    await page.getByRole("link", { name: "Products" }).click();
    await page.waitForURL("/admin/products");
    await expect(page.getByRole("heading", { name: /products/i })).toBeVisible();

    await page.getByRole("link", { name: "Content" }).click();
    await page.waitForURL("/admin/content");
    await expect(page.getByRole("heading", { name: /content/i })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run**

```bash
cd apps/web
( cd ../api && dotnet run ) &
sleep 12
npm run dev &
sleep 8
npx playwright test admin-flow.spec.ts --project=chromium
kill %1 %2 2>/dev/null || true
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tests/admin-flow.spec.ts
git commit -m "test(admin): e2e admin login + navigation smoke"
```

---

### Task 19: Update `README.md` admin section + cutover prep

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README admin section with**

```markdown
### Admin dashboard

After Phase 3, the admin panel lives at `/admin` inside the Zoe&Book FE.

Sign in at `/admin/login`. Defaults (override via `Admin__Email` /
`Admin__Password` env vars on the API):

| Field    | Value                |
| -------- | -------------------- |
| Email    | `admin@joviejoy.com` |
| Password | `changeme123`        |

#### Admin sections

- **Dashboard** — revenue summary + last 30 days + top products
- **Products** — rich CRUD with multi-image upload, PDF upload, collection tagging
- **Collections** — CRUD with hero image upload + curated product order
- **Content** — typed editors for `HomeHero`, `Announcement`, `HomeVideo`,
  `HeroArtwork`; raw-JSON fallback editor for other block types
- **Orders** — paginated table with status filter and line-item drill-down

All image uploads are stored under the BE's `/uploads/` static-files folder and
returned as relative URLs (`/uploads/products/...`, `/uploads/collections/...`,
`/uploads/content/...`, `/uploads/general/...`). The FE renders them by
prepending `NEXT_PUBLIC_API_URL`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: admin section for Phase 3"
```

---

## Done — Phase 3 acceptance checklist

- [ ] `cd apps/web && npx tsc --noEmit` passes.
- [ ] `cd apps/web && npm test` passes (includes admin-auth + ImageUpload tests).
- [ ] `cd apps/web && npx playwright test admin-flow.spec.ts` passes (with BE running).
- [ ] `/admin/login` renders; admin password sign-in works; redirects to `/admin`.
- [ ] `/admin` dashboard shows revenue summary + 30-day table + top products (zeros are OK on a fresh DB).
- [ ] `/admin/products` lists ~25 seeded products; "+ New product" form creates a new one.
- [ ] `/admin/products/<slug>` edits all rich fields; multi-image upload adds + reorders + removes; PDF upload works.
- [ ] `/admin/collections` lists 15 seeded collections; create + edit works; hero image upload shows preview.
- [ ] Collection edit reorders curated products; toggle adds/removes products.
- [ ] `/admin/content` lists all seeded ContentBlocks grouped by type.
- [ ] `/admin/content/home.hero` typed editor saves; image upload swaps the hero image and the homepage reflects the change.
- [ ] `/admin/content/announcement.bar` toggles the announcement bar on the storefront.
- [ ] `/admin/content/new` creates a block of any supported type.
- [ ] `/admin/orders` paginates + filters by status; line items drill-down works.
- [ ] Non-admin users hitting `/admin/*` redirect to `/admin/login`.
- [ ] README updated.

Phase 3 shippable. **All three phases now landed on `overhaul/zoe-book` →
ready for the final merge to `main` after a full-stack smoke check.**

---

## After all three phases land

1. Full smoke: drop local DB, boot stack, walk every storefront page + every admin page.
2. Stripe webhook + checkout dry run (test mode keys).
3. Squash + merge `overhaul/zoe-book` → `main` (or fast-forward if commit history is intentional).
4. Deploy: self-hosted runner builds + restarts containers. Confirm `/health` on the API and `/` on the FE.
5. Rotate `Jwt__Secret`, `Admin__Password`, `Stripe__SecretKey`, and `Google__ClientSecret` if any were committed during development.
