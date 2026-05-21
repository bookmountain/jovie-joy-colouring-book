"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminField, AdminInput, AdminLabel, AdminTextarea } from "@/components/admin/ui";

type Data = { title?: string; body?: string };

export function HomeIntroBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <AdminField>
        <AdminLabel htmlFor="hi-title">Title</AdminLabel>
        <AdminInput
          id="hi-title"
          onChange={(e) => onChange({ ...d, title: e.target.value })}
          value={d.title ?? ""}
        />
      </AdminField>
      <AdminField>
        <AdminLabel htmlFor="hi-body">Body</AdminLabel>
        <AdminTextarea
          id="hi-body"
          onChange={(e) => onChange({ ...d, body: e.target.value })}
          rows={5}
          value={d.body ?? ""}
        />
      </AdminField>
    </div>
  );
}
