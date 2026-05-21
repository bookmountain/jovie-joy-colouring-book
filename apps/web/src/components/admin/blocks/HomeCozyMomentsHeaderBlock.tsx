"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminField, AdminInput, AdminLabel } from "@/components/admin/ui";

type Data = { heading?: string };

export function HomeCozyMomentsHeaderBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <AdminField>
      <AdminLabel htmlFor="hcm-heading">Heading</AdminLabel>
      <AdminInput
        id="hcm-heading"
        onChange={(e) => onChange({ ...d, heading: e.target.value })}
        value={d.heading ?? ""}
      />
    </AdminField>
  );
}
