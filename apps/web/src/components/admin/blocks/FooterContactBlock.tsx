"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

type Data = {
  blurb?: string;
  customerCareLabel?: string;
  customerCareEmail?: string;
  licensingLabel?: string;
  licensingEmail?: string;
};

export function FooterContactBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Blurb</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, blurb: e.target.value })}
          value={d.blurb ?? ""}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-semibold">Customer-care label</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, customerCareLabel: e.target.value })}
            value={d.customerCareLabel ?? ""}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">Customer-care email</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, customerCareEmail: e.target.value })}
            type="email"
            value={d.customerCareEmail ?? ""}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">Licensing label</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, licensingLabel: e.target.value })}
            value={d.licensingLabel ?? ""}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">Licensing email</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, licensingEmail: e.target.value })}
            type="email"
            value={d.licensingEmail ?? ""}
          />
        </label>
      </div>
    </div>
  );
}
