"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { heading?: string };

export function HomeCozyMomentsHeaderBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">Heading</span>
      <input
        className="coco-input w-full"
        onChange={(e) => onChange({ ...d, heading: e.target.value })}
        value={d.heading ?? ""}
      />
    </label>
  );
}
