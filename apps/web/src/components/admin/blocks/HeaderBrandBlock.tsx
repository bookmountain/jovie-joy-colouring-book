"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminField, AdminInput, AdminLabel } from "@/components/admin/ui";

type Data = { name?: string; searchPlaceholder?: string };

export function HeaderBrandBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AdminField>
        <AdminLabel htmlFor="hb-name">Brand name</AdminLabel>
        <AdminInput
          id="hb-name"
          onChange={(e) => onChange({ ...d, name: e.target.value })}
          value={d.name ?? ""}
        />
      </AdminField>
      <AdminField>
        <AdminLabel htmlFor="hb-search">Search placeholder</AdminLabel>
        <AdminInput
          id="hb-search"
          onChange={(e) => onChange({ ...d, searchPlaceholder: e.target.value })}
          value={d.searchPlaceholder ?? ""}
        />
      </AdminField>
    </div>
  );
}
