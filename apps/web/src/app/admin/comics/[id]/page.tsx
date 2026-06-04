"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  adminListComics,
  adminCreateComic,
  adminUpdateComic,
  adminDeleteComic,
  adminUploadComicImage,
  type AdminComic,
} from "@/lib/adminApi";
import { AdminAssetImage } from "@/components/admin/AdminAssetImage";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPageHeader,
  AdminPanel,
  AdminTextarea,
} from "@/components/admin/ui";

const EMPTY: Omit<AdminComic, "id"> = {
  title: "", description: "", hasDownload: false, images: [], sortIndex: 0,
};

export default function AdminComicsWorldPage() {
  const params = useParams();
  const worldId = (params?.id as string) ?? "";

  const [rows, setRows] = useState<AdminComic[]>([]);
  const [draft, setDraft] = useState<Omit<AdminComic, "id">>({ ...EMPTY });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!worldId) return;
    adminListComics(worldId).then(setRows).catch((e: Error) => setError(e.message));
  }, [worldId]);

  function update(id: string, patch: Partial<AdminComic>) {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function updateImage(comicId: string, idx: number, patch: { src?: string; alt?: string }) {
    setRows((cur) => cur.map((r) =>
      r.id === comicId ? { ...r, images: r.images.map((img, i) => (i === idx ? { ...img, ...patch } : img)) } : r,
    ));
  }

  function addImage(comicId: string) {
    setRows((cur) => cur.map((r) =>
      r.id === comicId ? { ...r, images: [...r.images, { src: "", alt: "" }] } : r,
    ));
  }

  function removeImage(comicId: string, idx: number) {
    setRows((cur) => cur.map((r) =>
      r.id === comicId ? { ...r, images: r.images.filter((_, i) => i !== idx) } : r,
    ));
  }

  async function uploadImageFor(comicId: string, file: File) {
    setError(null);
    try {
      const { url } = await adminUploadComicImage(worldId, comicId, file);
      setRows((cur) => cur.map((r) =>
        r.id === comicId ? { ...r, images: [...r.images, { src: url, alt: "" }] } : r,
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function save(row: AdminComic) {
    setError(null);
    try {
      const saved = await adminUpdateComic(worldId, row.id, {
        title: row.title,
        description: row.description,
        hasDownload: row.hasDownload,
        images: row.images,
        sortIndex: row.sortIndex,
      });
      update(row.id, saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this comic?")) return;
    setError(null);
    try {
      await adminDeleteComic(worldId, id);
      setRows((cur) => cur.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function create() {
    setError(null);
    setCreating(true);
    try {
      const created = await adminCreateComic(worldId, draft);
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
        crumb={<Link className="text-cocoa-purple underline" href="/admin/comics">← Back to comic worlds</Link>}
        title="Comics in world"
        subtitle="Add comics, give each a title + description, and upload page images in sequence."
      />

      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}

      {rows.map((row) => (
        <AdminPanel className="space-y-3" key={row.id}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{row.title || row.id}</h2>
            <code className="text-xs text-cocoa-text">{row.id}</code>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField>
              <AdminLabel htmlFor={`c-title-${row.id}`}>Title</AdminLabel>
              <AdminInput
                id={`c-title-${row.id}`}
                onChange={(e) => update(row.id, { title: e.target.value })}
                value={row.title}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`c-sort-${row.id}`}>Sort index</AdminLabel>
              <AdminInput
                id={`c-sort-${row.id}`}
                inputMode="numeric"
                onChange={(e) => update(row.id, { sortIndex: Number(e.target.value) || 0 })}
                value={String(row.sortIndex)}
              />
            </AdminField>
          </div>
          <AdminField>
            <AdminLabel htmlFor={`c-desc-${row.id}`}>Description</AdminLabel>
            <AdminTextarea
              id={`c-desc-${row.id}`}
              onChange={(e) => update(row.id, { description: e.target.value })}
              rows={3}
              value={row.description}
            />
          </AdminField>
          <label className="flex items-center gap-2">
            <input
              checked={row.hasDownload}
              onChange={(e) => update(row.id, { hasDownload: e.target.checked })}
              type="checkbox"
            />
            <span className="text-sm font-semibold">Has download</span>
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Pages ({row.images.length})</span>
              <div className="flex items-center gap-2">
                <input
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadImageFor(row.id, f);
                    e.target.value = "";
                  }}
                  ref={(el) => { uploadInputRefs.current[row.id] = el; }}
                  type="file"
                />
                <AdminButton
                  onClick={() => uploadInputRefs.current[row.id]?.click()}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Upload + add
                </AdminButton>
                <AdminButton
                  onClick={() => addImage(row.id)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  + Empty row
                </AdminButton>
              </div>
            </div>
            {row.images.map((img, idx) => (
              <div className="flex items-center gap-3" key={idx}>
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-coco-sm border border-cocoa-line bg-white">
                  {img.src ? (
                    <AdminAssetImage alt={img.alt} className="h-full w-full object-cover" src={img.src} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-cocoa-text">
                      empty
                    </div>
                  )}
                </div>
                <AdminInput
                  aria-label="src"
                  onChange={(e) => updateImage(row.id, idx, { src: e.target.value })}
                  placeholder="/uploads/..."
                  value={img.src}
                />
                <AdminInput
                  aria-label="alt"
                  onChange={(e) => updateImage(row.id, idx, { alt: e.target.value })}
                  placeholder="alt text"
                  value={img.alt}
                />
                <button
                  className="text-xs text-cocoa-coral underline"
                  onClick={() => removeImage(row.id, idx)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <AdminButton onClick={() => save(row)} type="button" variant="primary">Save</AdminButton>
            <button
              className="text-xs text-cocoa-coral underline"
              onClick={() => remove(row.id)}
              type="button"
            >
              Delete
            </button>
          </div>
        </AdminPanel>
      ))}

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">Add new comic</h2>
        <AdminField>
          <AdminLabel htmlFor="c-new-title">Title</AdminLabel>
          <AdminInput
            id="c-new-title"
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            value={draft.title}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="c-new-desc">Description</AdminLabel>
          <AdminTextarea
            id="c-new-desc"
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={3}
            value={draft.description}
          />
        </AdminField>
        <p className="text-xs text-cocoa-text">After creating, upload page images on the resulting card.</p>
        <AdminButton
          disabled={creating || !draft.title}
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
