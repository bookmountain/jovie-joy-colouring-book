"use client";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { adminUploadContentImage } from "@/lib/adminApi";
import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminField, AdminInput, AdminLabel } from "@/components/admin/ui";

type Data = { enabled?: boolean; text?: string; href?: string; backgroundImage?: string };

export function AnnouncementBlock({ blockKey, data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input
          checked={d.enabled ?? false}
          onChange={(e) => onChange({ ...d, enabled: e.target.checked })}
          type="checkbox"
        />
        <span className="text-sm font-semibold">Show announcement bar</span>
      </label>
      <AdminField>
        <AdminLabel htmlFor="ann-text">Text</AdminLabel>
        <AdminInput
          id="ann-text"
          onChange={(e) => onChange({ ...d, text: e.target.value })}
          value={d.text ?? ""}
        />
      </AdminField>
      <AdminField>
        <AdminLabel htmlFor="ann-href">Href</AdminLabel>
        <AdminInput
          id="ann-href"
          onChange={(e) => onChange({ ...d, href: e.target.value })}
          value={d.href ?? ""}
        />
      </AdminField>
      <ImageUpload
        label="Background image (optional)"
        onChange={(url) => onChange({ ...d, backgroundImage: url ?? undefined })}
        upload={(f) => adminUploadContentImage(blockKey, f)}
        value={d.backgroundImage ?? null}
      />
    </div>
  );
}
