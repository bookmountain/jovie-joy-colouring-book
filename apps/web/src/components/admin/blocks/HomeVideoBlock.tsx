"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminField, AdminInput, AdminLabel } from "@/components/admin/ui";

type Data = { src?: string; youtubeHref?: string };

export function HomeVideoBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <AdminField>
        <AdminLabel htmlFor="hv-src">Video file URL (.mp4)</AdminLabel>
        <AdminInput
          id="hv-src"
          onChange={(e) => onChange({ ...d, src: e.target.value })}
          value={d.src ?? ""}
        />
      </AdminField>
      <AdminField>
        <AdminLabel htmlFor="hv-yt">YouTube fallback URL</AdminLabel>
        <AdminInput
          id="hv-yt"
          onChange={(e) => onChange({ ...d, youtubeHref: e.target.value })}
          value={d.youtubeHref ?? ""}
        />
      </AdminField>
    </div>
  );
}
