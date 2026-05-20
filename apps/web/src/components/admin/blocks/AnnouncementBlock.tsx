"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { enabled?: boolean; text?: string; href?: string };

export function AnnouncementBlock({ data, onChange }: ContentBlockEditorProps) {
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
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Text</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, text: e.target.value })}
          value={d.text ?? ""}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Href</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, href: e.target.value })}
          value={d.href ?? ""}
        />
      </label>
    </div>
  );
}
