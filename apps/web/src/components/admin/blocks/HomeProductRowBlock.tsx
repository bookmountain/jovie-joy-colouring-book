"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminField, AdminInput, AdminLabel } from "@/components/admin/ui";

type Data = {
  eyebrow?: string;
  title?: string;
  href?: string;
  collectionSlug?: string;
  itemCount?: number;
};

export function HomeProductRowBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField>
          <AdminLabel htmlFor="hpr-eyebrow">Eyebrow</AdminLabel>
          <AdminInput
            id="hpr-eyebrow"
            onChange={(e) => onChange({ ...d, eyebrow: e.target.value })}
            placeholder="e.g. Just landed"
            value={d.eyebrow ?? ""}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="hpr-title">Title</AdminLabel>
          <AdminInput
            id="hpr-title"
            onChange={(e) => onChange({ ...d, title: e.target.value })}
            placeholder="e.g. New Release"
            value={d.title ?? ""}
          />
        </AdminField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField>
          <AdminLabel htmlFor="hpr-slug">Collection slug</AdminLabel>
          <AdminInput
            id="hpr-slug"
            onChange={(e) => onChange({ ...d, collectionSlug: e.target.value })}
            placeholder="e.g. new-release"
            value={d.collectionSlug ?? ""}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="hpr-href">&ldquo;View all&rdquo; link href</AdminLabel>
          <AdminInput
            id="hpr-href"
            onChange={(e) => onChange({ ...d, href: e.target.value })}
            placeholder="e.g. /collections/new-release"
            value={d.href ?? ""}
          />
        </AdminField>
      </div>
      <AdminField>
        <AdminLabel htmlFor="hpr-count">Items to show</AdminLabel>
        <AdminInput
          id="hpr-count"
          inputMode="numeric"
          onChange={(e) => onChange({ ...d, itemCount: Number(e.target.value) || 0 })}
          value={String(d.itemCount ?? 4)}
        />
      </AdminField>
    </div>
  );
}
