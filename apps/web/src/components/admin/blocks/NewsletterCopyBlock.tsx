"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = { heading?: string; ctaLabel?: string; successMessage?: string };

export function NewsletterCopyBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Heading</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, heading: e.target.value })}
          value={d.heading ?? ""}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-semibold">CTA label</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, ctaLabel: e.target.value })}
            value={d.ctaLabel ?? ""}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">Success message</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, successMessage: e.target.value })}
            value={d.successMessage ?? ""}
          />
        </label>
      </div>
    </div>
  );
}
