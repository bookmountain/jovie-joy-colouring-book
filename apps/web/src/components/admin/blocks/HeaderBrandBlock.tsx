"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { name?: string; searchPlaceholder?: string };

export function HeaderBrandBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label>
        <span className="mb-1 block text-sm font-semibold">Brand name</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, name: e.target.value })}
          value={d.name ?? ""}
        />
      </label>
      <label>
        <span className="mb-1 block text-sm font-semibold">Search placeholder</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, searchPlaceholder: e.target.value })}
          value={d.searchPlaceholder ?? ""}
        />
      </label>
    </div>
  );
}
