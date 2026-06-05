"use client";

import { useEffect, useRef, useState } from "react";
import {
  adminListGallery,
  adminCreateGalleryImage,
  adminUpdateGalleryImage,
  adminDeleteGalleryImage,
  adminUploadGalleryImage,
  type AdminGalleryImage,
} from "@/lib/adminApi";
import { AdminAssetImage } from "@/components/admin/AdminAssetImage";
import { StaticPageHeaderEditor } from "@/components/admin/StaticPageHeaderEditor";
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

export default function AdminGalleryPage() {
  const [rows, setRows] = useState<AdminGalleryImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminGalleryImage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminListGallery().then(setRows).catch((e: Error) => setError(e.message));
  }, []);

  function update(id: string, patch: Partial<AdminGalleryImage>) {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRow(row: AdminGalleryImage) {
    setError(null);
    try {
      const saved = await adminUpdateGalleryImage(row.id, {
        src: row.src,
        alt: row.alt,
        sortIndex: row.sortIndex,
      });
      update(row.id, saved);
      notifySaved("Image");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      notifyError(e);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await adminDeleteGalleryImage(id);
      setRows((cur) => cur.filter((r) => r.id !== id));
      notifyDeleted("Image");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      notifyError(e);
    } finally {
      setPendingDelete(null);
    }
  }

  async function uploadAndCreate(file: File) {
    setError(null);
    setUploading(true);
    try {
      const { url } = await adminUploadGalleryImage(file);
      const created = await adminCreateGalleryImage({
        src: url,
        alt: "",
        sortIndex: rows.length,
      });
      setRows((cur) => [...cur, created]);
      notifySaved("Image");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      notifyError(e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Gallery"
        subtitle="Drives the Cozy Moments grid on the homepage (and the fallback images for the Hi Friend! panel). Upload square images at 1:1 ratio for best results."
      />

      <StaticPageHeaderEditor slug="gallery" heading="Page header" hint="Title + intro shown on /pages/gallery." />

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">Upload a new image</h2>
        <input
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadAndCreate(f);
            e.target.value = "";
          }}
          ref={fileRef}
          type="file"
        />
        <AdminButton
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          type="button"
          variant="primary"
        >
          {uploading ? "Uploading…" : "Choose image"}
        </AdminButton>
        <p className="text-xs text-cocoa-text">After upload, set the alt text + sort index below.</p>
      </AdminPanel>

      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="text-sm text-cocoa-text">No gallery images yet.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <AdminPanel className="space-y-3" key={row.id}>
            <div className="relative aspect-square overflow-hidden rounded-coco-sm border border-cocoa-line bg-white">
              {row.src ? (
                <AdminAssetImage
                  alt={row.alt || "Gallery image"}
                  className="h-full w-full object-cover"
                  src={row.src}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-cocoa-text">
                  No image
                </div>
              )}
            </div>
            <AdminField>
              <AdminLabel htmlFor={`g-alt-${row.id}`}>Alt text</AdminLabel>
              <AdminInput
                id={`g-alt-${row.id}`}
                onChange={(e) => update(row.id, { alt: e.target.value })}
                value={row.alt}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`g-sort-${row.id}`}>Sort index</AdminLabel>
              <AdminInput
                id={`g-sort-${row.id}`}
                inputMode="numeric"
                onChange={(e) => update(row.id, { sortIndex: Number(e.target.value) || 0 })}
                value={String(row.sortIndex)}
              />
            </AdminField>
            <div className="flex items-center gap-3">
              <AdminButton onClick={() => saveRow(row)} type="button" variant="primary">Save</AdminButton>
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
      </div>

      <AdminConfirmDialog
        open={!!pendingDelete}
        title="Delete this image?"
        body="This gallery image will be permanently removed."
        confirmLabel="Delete image"
        destructive
        onConfirm={() => {
          if (pendingDelete) return remove(pendingDelete.id);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
