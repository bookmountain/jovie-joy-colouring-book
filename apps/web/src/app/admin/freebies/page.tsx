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
import {
  AdminPageHeader,
  AdminPanel,
  AdminButton,
  AdminInput,
  AdminTextarea,
  AdminModal,
  AdminConfirmDialog,
} from "@/components/admin/ui";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminFreebiesPage() {
  const router = useRouter();
  const [items, setItems] = useState<FreebieAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  // New-freebie modal state
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newExcerpt, setNewExcerpt] = useState("");
  const [newPublished, setNewPublished] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Delete confirm state
  const [pendingDelete, setPendingDelete] = useState<FreebieAdmin | null>(null);

  async function refresh() {
    setLoading(true);
    try { setItems(await adminListFreebies()); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  function openNew() {
    setNewTitle("");
    setNewExcerpt("");
    setNewPublished(false);
    setNewError(null);
    setNewOpen(true);
  }

  async function submitNew() {
    const title = newTitle.trim();
    if (!title) { setNewError("Title is required"); return; }
    const slug = slugify(title);
    if (!slug) { setNewError("Title must contain letters or numbers"); return; }
    if (items.some((x) => x.slug === slug)) { setNewError(`A freebie with slug "${slug}" already exists`); return; }
    setCreating(true);
    setNewError(null);
    try {
      await adminCreateFreebie({ slug, title, excerpt: newExcerpt.trim(), description: [], published: newPublished });
      setNewOpen(false);
      router.push(`/admin/freebies/${slug}`);
    } catch (err) {
      setNewError(err instanceof Error ? err.message : "Could not create freebie");
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

  async function confirmDelete() {
    if (!pendingDelete) return;
    await adminDeleteFreebie(pendingDelete.slug);
    setPendingDelete(null);
    await refresh();
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Freebies"
        subtitle="Email-gated downloads shown on /pages/freebies. Edit a row to update the cover, file, and copy."
        actions={<AdminButton onClick={openNew}>+ New freebie</AdminButton>}
      />

      <StaticPageHeaderEditor slug="freebies" heading="Page header" hint="Title + intro shown above the grid on /pages/freebies." />

      <AdminPanel>
        {loading ? (
          <div className="text-sm text-cocoa-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-cocoa-muted">No freebies yet — click &ldquo;+ New freebie&rdquo; to add one.</div>
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
                    <button onClick={() => setPendingDelete(f)} className="text-xs text-red-600 underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminPanel>

      <AdminModal
        open={newOpen}
        title="New freebie"
        description="Start with a title and short blurb. You can upload the cover and file on the next page."
        onClose={() => { if (!creating) setNewOpen(false); }}
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setNewOpen(false)} disabled={creating}>Cancel</AdminButton>
            <AdminButton onClick={submitNew} disabled={creating}>{creating ? "Creating…" : "Create & edit"}</AdminButton>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-sm font-semibold">
            Title
            <AdminInput
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Mini Coloring Book"
              maxLength={140}
              className="mt-1"
            />
            <span className="mt-1 block text-xs text-cocoa-muted">
              Slug: <span className="font-mono">{slugify(newTitle) || "—"}</span>
            </span>
          </label>
          <label className="block text-sm font-semibold">
            Excerpt
            <AdminTextarea
              value={newExcerpt}
              onChange={(e) => setNewExcerpt(e.target.value)}
              placeholder="One-liner shown on the card."
              maxLength={140}
              rows={2}
              className="mt-1"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={newPublished}
              onChange={(e) => setNewPublished(e.target.checked)}
            />
            Publish immediately
          </label>
          {newError ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{newError}</p> : null}
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `Delete "${pendingDelete.title}"?` : ""}
        body="This also removes the freebie's request history. The action cannot be undone."
        confirmLabel="Delete freebie"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
