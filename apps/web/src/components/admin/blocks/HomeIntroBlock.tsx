"use client";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { adminUploadContentImage } from "@/lib/adminApi";
import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminField, AdminInput, AdminLabel, AdminTextarea } from "@/components/admin/ui";

type Data = { title?: string; body?: string; image1?: string; image2?: string };

export function HomeIntroBlock({ blockKey, data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <AdminField>
        <AdminLabel htmlFor="hi-title">Title</AdminLabel>
        <AdminInput
          id="hi-title"
          onChange={(e) => onChange({ ...d, title: e.target.value })}
          value={d.title ?? ""}
        />
      </AdminField>
      <AdminField>
        <AdminLabel htmlFor="hi-body">Body</AdminLabel>
        <AdminTextarea
          id="hi-body"
          onChange={(e) => onChange({ ...d, body: e.target.value })}
          rows={5}
          value={d.body ?? ""}
        />
      </AdminField>
      <div className="grid gap-3 sm:grid-cols-2">
        <ImageUpload
          label="Image 1 (left tile)"
          onChange={(url) => onChange({ ...d, image1: url ?? undefined })}
          upload={(f) => adminUploadContentImage(blockKey, f)}
          value={d.image1 ?? null}
        />
        <ImageUpload
          label="Image 2 (right tile)"
          onChange={(url) => onChange({ ...d, image2: url ?? undefined })}
          upload={(f) => adminUploadContentImage(blockKey, f)}
          value={d.image2 ?? null}
        />
      </div>
      <p className="text-xs text-cocoa-text">
        Leave both empty to fall back to the first two images from the Gallery.
      </p>
    </div>
  );
}
