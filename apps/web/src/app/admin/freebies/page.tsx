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
        actions={<AdminButton onClick={createNew} disabled={creating}>+ New freebie</AdminButton>}
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
