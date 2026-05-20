"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { src?: string; youtubeHref?: string };

export function HomeVideoBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Video file URL (.mp4)</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, src: e.target.value })}
          value={d.src ?? ""}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">YouTube fallback URL</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, youtubeHref: e.target.value })}
          value={d.youtubeHref ?? ""}
        />
      </label>
    </div>
  );
}
