"use client";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { adminUploadContentImage } from "@/lib/adminApi";
import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { image?: string; desktop?: string; mobile?: string };

// Tolerate the legacy { desktop, mobile } shape — prefer desktop if image is missing.
function pickImage(d: Data): string {
  return d.image || d.desktop || d.mobile || "";
}

export function HeroArtworkBlock({ blockKey, data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  const current = pickImage(d);

  return (
    <ImageUpload
      label="Image"
      onChange={(url) => {
        // Always write the new `image` field, and clear the legacy desktop/mobile
        // ones so the row doesn't carry both shapes after the next save.
        onChange({ image: url ?? "", desktop: undefined, mobile: undefined });
      }}
      upload={(f) => adminUploadContentImage(blockKey, f)}
      value={current || null}
      variant="banner"
    />
  );
}
