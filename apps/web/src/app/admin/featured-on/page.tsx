"use client";

import { useEffect, useState } from "react";
import {
  adminListFeaturedOn,
  adminCreateFeaturedOn,
  adminUpdateFeaturedOn,
  adminDeleteFeaturedOn,
  adminUploadFeaturedOnImage,
  type AdminFeaturedOn,
} from "@/lib/adminApi";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  AdminButton,
  AdminConfirmDialog,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/ui";
import { notifySaved, notifyDeleted, notifyError } from "@/lib/toast";

const EMPTY: Omit<AdminFeaturedOn, "slug"> & { slug: string } = {
  slug: "",
  label: "",
  href: "",
  image: "",
  alt: "",
  sortIndex: 0,
};

export default function AdminFeaturedOnPage() {
  const [rows, setRows] = useState<AdminFeaturedOn[]>([]);
  const [draft, setDraft] = useState<AdminFeaturedOn>({ ...EMPTY });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminFeaturedOn | null>(null);

  useEffect(() => {
    adminListFeaturedOn().then(setRows).catch((e: Error) => setError(e.message));
  }, []);

  function update(slug: string, patch: Partial<AdminFeaturedOn>) {
    setRows((cur) => cur.map((r) => (r.slug === slug ? { ...r, ...patch } : r)));
  }

  async function save(row: AdminFeaturedOn) {
    setError(null);
    try {
      const saved = await adminUpdateFeaturedOn(row.slug, {
        label: row.label,
        href: row.href,
        image: row.image,
        alt: row.alt,
        sortIndex: row.sortIndex,
      });
      update(row.slug, saved);
      notifySaved("Badge");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      notifyError(e);
    }
  }

  async function remove(slug: string) {
    setError(null);
    try {
      await adminDeleteFeaturedOn(slug);
      setRows((cur) => cur.filter((r) => r.slug !== slug));
      notifyDeleted("Badge");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      notifyError(e);
    } finally {
      setPendingDelete(null);
    }
  }

  async function create() {
    setError(null);
    setCreating(true);
    try {
      const created = await adminCreateFeaturedOn(draft);
      setRows((cur) => [...cur, created]);
      setDraft({ ...EMPTY });
      notifySaved("Badge");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
      notifyError(e);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Featured On"
        subtitle="Press/marketplace badges rendered on the homepage. Each item needs a slug (URL-safe id), label, link, and image."
      />

      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}

      {rows.map((row) => (
        <AdminPanel className="space-y-3" key={row.slug}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{row.label || row.slug}</h2>
            <code className="text-xs text-cocoa-text">{row.slug}</code>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField>
              <AdminLabel htmlFor={`fo-label-${row.slug}`}>Label</AdminLabel>
              <AdminInput
                id={`fo-label-${row.slug}`}
                onChange={(e) => update(row.slug, { label: e.target.value })}
                value={row.label}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`fo-href-${row.slug}`}>Link href</AdminLabel>
              <AdminInput
                id={`fo-href-${row.slug}`}
                onChange={(e) => update(row.slug, { href: e.target.value })}
                value={row.href}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`fo-alt-${row.slug}`}>Alt text</AdminLabel>
              <AdminInput
                id={`fo-alt-${row.slug}`}
                onChange={(e) => update(row.slug, { alt: e.target.value })}
                value={row.alt}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`fo-sort-${row.slug}`}>Sort index</AdminLabel>
              <AdminInput
                id={`fo-sort-${row.slug}`}
                inputMode="numeric"
                onChange={(e) => update(row.slug, { sortIndex: Number(e.target.value) || 0 })}
                value={String(row.sortIndex)}
              />
            </AdminField>
          </div>
          <ImageUpload
            label="Badge image"
            onChange={(url) => update(row.slug, { image: url ?? "" })}
            upload={(f) => adminUploadFeaturedOnImage(row.slug, f)}
            value={row.image || null}
          />
          <div className="flex items-center gap-3">
            <AdminButton onClick={() => save(row)} type="button" variant="primary">Save</AdminButton>
            <button
              className="text-xs text-cocoa-coral underline"
              onClick={() => setPendingDelete(row)}
              type="button"
            >
              Delete
            </button>
          </div>
        </AdminPanel>
      ))}

      <AdminConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.label || pendingDelete?.slug}"?`}
        body="This badge will be permanently removed."
        confirmLabel="Delete badge"
        destructive
        onConfirm={() => {
          if (pendingDelete) return remove(pendingDelete.slug);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">Add new</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField>
            <AdminLabel htmlFor="fo-new-slug">Slug</AdminLabel>
            <AdminInput
              id="fo-new-slug"
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              placeholder="e.g. nytimes"
              value={draft.slug}
            />
          </AdminField>
          <AdminField>
            <AdminLabel htmlFor="fo-new-label">Label</AdminLabel>
            <AdminInput
              id="fo-new-label"
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              value={draft.label}
            />
          </AdminField>
          <AdminField>
            <AdminLabel htmlFor="fo-new-href">Link href</AdminLabel>
            <AdminInput
              id="fo-new-href"
              onChange={(e) => setDraft({ ...draft, href: e.target.value })}
              value={draft.href}
            />
          </AdminField>
          <AdminField>
            <AdminLabel htmlFor="fo-new-alt">Alt text</AdminLabel>
            <AdminInput
              id="fo-new-alt"
              onChange={(e) => setDraft({ ...draft, alt: e.target.value })}
              value={draft.alt}
            />
          </AdminField>
        </div>
        <p className="text-xs text-cocoa-text">
          Create the row first, then upload the badge image on the resulting card.
        </p>
        <AdminButton
          disabled={creating || !draft.slug || !draft.label}
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
