"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminField, AdminInput, AdminLabel } from "@/components/admin/ui";

type Data = { heading?: string; ctaLabel?: string; successMessage?: string };

export function NewsletterCopyBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <AdminField>
        <AdminLabel htmlFor="nl-heading">Heading</AdminLabel>
        <AdminInput
          id="nl-heading"
          onChange={(e) => onChange({ ...d, heading: e.target.value })}
          value={d.heading ?? ""}
        />
      </AdminField>
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField>
          <AdminLabel htmlFor="nl-cta">CTA label</AdminLabel>
          <AdminInput
            id="nl-cta"
            onChange={(e) => onChange({ ...d, ctaLabel: e.target.value })}
            value={d.ctaLabel ?? ""}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="nl-success">Success message</AdminLabel>
          <AdminInput
            id="nl-success"
            onChange={(e) => onChange({ ...d, successMessage: e.target.value })}
            value={d.successMessage ?? ""}
          />
        </AdminField>
      </div>
    </div>
  );
}
