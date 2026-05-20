"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { title?: string; body?: string };

export function HomeIntroBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Title</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, title: e.target.value })}
          value={d.title ?? ""}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Body</span>
        <textarea
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, body: e.target.value })}
          rows={5}
          value={d.body ?? ""}
        />
      </label>
    </div>
  );
}
