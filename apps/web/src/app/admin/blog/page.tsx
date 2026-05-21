"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  adminListBlogCategories,
  adminCreateBlogCategory,
  adminUpdateBlogCategory,
  adminDeleteBlogCategory,
  adminUploadBlogCategoryImage,
  type AdminBlogCategory,
} from "@/lib/adminApi";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPageHeader,
  AdminPanel,
  AdminTextarea,
} from "@/components/admin/ui";

const EMPTY: AdminBlogCategory = { slug: "", title: "", excerpt: "", image: "", sortIndex: 0 };

export default function AdminBlogPage() {
  const [rows, setRows] = useState<AdminBlogCategory[]>([]);
  const [draft, setDraft] = useState<AdminBlogCategory>({ ...EMPTY });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminListBlogCategories().then(setRows).catch((e: Error) => setError(e.message));
  }, []);

  function update(slug: string, patch: Partial<AdminBlogCategory>) {
    setRows((cur) => cur.map((r) => (r.slug === slug ? { ...r, ...patch } : r)));
  }

  async function save(row: AdminBlogCategory) {
    setError(null);
    try {
      const saved = await adminUpdateBlogCategory(row.slug, {
        title: row.title, excerpt: row.excerpt, image: row.image, sortIndex: row.sortIndex,
      });
      update(row.slug, saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(slug: string) {
    if (!confirm(`Delete category "${slug}" and ALL its articles?`)) return;
    setError(null);
    try {
      await adminDeleteBlogCategory(slug);
      setRows((cur) => cur.filter((r) => r.slug !== slug));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function create() {
    setError(null);
    setCreating(true);
    try {
      const created = await adminCreateBlogCategory(draft);
      setRows((cur) => [...cur, created]);
      setDraft({ ...EMPTY });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Blog"
        subtitle="Manage blog categories (also surfaced as the 'Blog category cards' section on the homepage). Click a category to manage its articles."
      />

      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}

      {rows.map((row) => (
        <AdminPanel className="space-y-3" key={row.slug}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{row.title || row.slug}</h2>
            <Link className="text-xs text-cocoa-purple underline" href={`/admin/blog/${row.slug}`}>
              Manage articles →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField>
              <AdminLabel htmlFor={`bc-title-${row.slug}`}>Title</AdminLabel>
              <AdminInput
                id={`bc-title-${row.slug}`}
                onChange={(e) => update(row.slug, { title: e.target.value })}
                value={row.title}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`bc-sort-${row.slug}`}>Sort index</AdminLabel>
              <AdminInput
                id={`bc-sort-${row.slug}`}
                inputMode="numeric"
                onChange={(e) => update(row.slug, { sortIndex: Number(e.target.value) || 0 })}
                value={String(row.sortIndex)}
              />
            </AdminField>
          </div>
          <AdminField>
            <AdminLabel htmlFor={`bc-excerpt-${row.slug}`}>Excerpt</AdminLabel>
            <AdminTextarea
              id={`bc-excerpt-${row.slug}`}
              onChange={(e) => update(row.slug, { excerpt: e.target.value })}
              rows={3}
              value={row.excerpt}
            />
          </AdminField>
          <ImageUpload
            label="Category card image"
            onChange={(url) => update(row.slug, { image: url ?? "" })}
            upload={(f) => adminUploadBlogCategoryImage(row.slug, f)}
            value={row.image || null}
          />
          <div className="flex items-center gap-3">
            <AdminButton onClick={() => save(row)} type="button" variant="primary">Save</AdminButton>
            <button
              className="text-xs text-cocoa-coral underline"
              onClick={() => remove(row.slug)}
              type="button"
            >
              Delete
            </button>
          </div>
        </AdminPanel>
      ))}

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">Add new category</h2>
        <AdminField>
          <AdminLabel htmlFor="bc-new-slug">Slug</AdminLabel>
          <AdminInput
            id="bc-new-slug"
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            placeholder="e.g. tutorials"
            value={draft.slug}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="bc-new-title">Title</AdminLabel>
          <AdminInput
            id="bc-new-title"
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            value={draft.title}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="bc-new-excerpt">Excerpt</AdminLabel>
          <AdminTextarea
            id="bc-new-excerpt"
            onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
            rows={3}
            value={draft.excerpt}
          />
        </AdminField>
        <p className="text-xs text-cocoa-text">After creating, upload the card image on the resulting card below.</p>
        <AdminButton
          disabled={creating || !draft.slug || !draft.title}
          onClick={create}
          type="button"
          variant="primary"
        >
          {creating ? "Creating…" : "Create"}
        </AdminButton>
      </AdminPanel>
    </div>
  );
}
