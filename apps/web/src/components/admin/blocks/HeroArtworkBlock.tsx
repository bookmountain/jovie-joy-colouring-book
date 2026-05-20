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
        label="Desktop image"
        onChange={(url) => onChange({ ...d, desktop: url ?? undefined })}
        upload={(f) => adminUploadContentImage(`${blockKey}-desktop`, f)}
        value={d.desktop ?? null}
      />
      <ImageUpload
        label="Mobile image"
        onChange={(url) => onChange({ ...d, mobile: url ?? undefined })}
        upload={(f) => adminUploadContentImage(`${blockKey}-mobile`, f)}
        value={d.mobile ?? null}
      />
    </div>
  );
}
