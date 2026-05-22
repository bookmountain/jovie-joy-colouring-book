"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import {
  adminUpdateFreebie,
  adminDeleteFreebie,
  adminUploadFreebieCover,
  adminUploadFreebieFile,
  type FreebieAdmin,
} from "@/lib/freebies";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { AdminPanel, AdminButton, AdminConfirmDialog } from "@/components/admin/ui";

export function FreebieForm({ initial, onSaved, onDeleted }: {
  initial: FreebieAdmin;
  onSaved: () => Promise<void> | void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [descriptionText, setDescriptionText] = useState(initial.description.join("\n\n"));
  const [published, setPublished] = useState(initial.published);
  const [saving, setSaving] = useState(false);
  const [fileMeta, setFileMeta] = useState({
    kind: initial.fileKind,
    size: initial.fileSizeBytes,
    path: initial.filePath,
  });
  const [cover, setCover] = useState<string | null>(initial.coverImage || null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await adminUpdateFreebie(initial.slug, {
        title,
        excerpt,
        description: descriptionText.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean),
        published,
      });
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function uploadCover(file: File): Promise<{ url: string }> {
    const dto = await adminUploadFreebieCover(initial.slug, file);
    setCover(dto.coverImage);
    await onSaved();
    return { url: dto.coverImage };
  }

  async function uploadFile(file: File) {
    setFileError(null);
    setFileBusy(true);
    try {
      const updated = await adminUploadFreebieFile(initial.slug, file);
      setFileMeta({ kind: updated.fileKind, size: updated.fileSizeBytes, path: updated.filePath });
      await onSaved();
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "File upload failed");
    } finally {
      setFileBusy(false);
    }
  }

  async function destroy() {
    await adminDeleteFreebie(initial.slug);
    setDeleteOpen(false);
    onDeleted();
  }

  return (
    <div className="space-y-6">
      <AdminPanel className="space-y-3">
        <label className="block text-sm font-semibold">Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border border-cocoa-line px-3 py-2" />
        </label>
        <label className="block text-sm font-semibold">Excerpt
          <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="mt-1 w-full rounded-md border border-cocoa-line px-3 py-2" maxLength={140} />
        </label>
        <label className="block text-sm font-semibold">Description (separate paragraphs with blank lines)
          <textarea value={descriptionText} onChange={(e) => setDescriptionText(e.target.value)} rows={6} className="mt-1 w-full rounded-md border border-cocoa-line px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Published
        </label>
      </AdminPanel>

      <AdminPanel>
        <h3 className="mb-2 text-sm font-bold">Cover image</h3>
        <ImageUpload
          value={cover}
          onChange={(url) => setCover(url)}
          upload={uploadCover}
          variant="compact"
        />
      </AdminPanel>

      <AdminPanel>
        <h3 className="mb-2 text-sm font-bold">Downloadable file</h3>
        <p className="mb-2 text-xs text-cocoa-muted">
          Current: {fileMeta.path ? (
            <>
              {fileMeta.kind.toUpperCase()} · {(fileMeta.size / 1024).toFixed(0)} KB · {" "}
              <a className="underline" href={`${API_URL}${fileMeta.path}`} target="_blank" rel="noreferrer">download a copy</a>
            </>
          ) : "none"}
        </p>
        <input
          type="file"
          accept=".pdf,.zip"
          disabled={fileBusy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
            e.target.value = "";
          }}
        />
        {fileBusy ? <p className="mt-2 text-xs text-cocoa-muted">Uploading…</p> : null}
        {fileError ? <p className="mt-2 text-xs text-cocoa-coral">{fileError}</p> : null}
      </AdminPanel>

      <div className="flex justify-between">
        <AdminButton variant="danger" onClick={() => setDeleteOpen(true)}>Delete freebie</AdminButton>
        <AdminButton onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</AdminButton>
      </div>

      <AdminConfirmDialog
        open={deleteOpen}
        title={`Delete "${initial.title}"?`}
        body="This also removes the freebie's request history. The action cannot be undone."
        confirmLabel="Delete freebie"
        destructive
        onConfirm={destroy}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
