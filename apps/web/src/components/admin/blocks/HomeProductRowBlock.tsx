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

export function HomeProductRowBlock({ blockKey, data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  const idPrefix = `hpr-${blockKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  // The New Release row is fed automatically from the newest products and
  // always links to /products, so it has no collection or link settings.
  const isAutomaticRow = blockKey === "home.row.new-release";
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField>
          <AdminLabel htmlFor={`${idPrefix}-eyebrow`}>Eyebrow</AdminLabel>
          <AdminInput
            id={`${idPrefix}-eyebrow`}
            onChange={(e) => onChange({ ...d, eyebrow: e.target.value })}
            placeholder="e.g. Just landed"
            value={d.eyebrow ?? ""}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor={`${idPrefix}-title`}>Title</AdminLabel>
          <AdminInput
            id={`${idPrefix}-title`}
            onChange={(e) => onChange({ ...d, title: e.target.value })}
            placeholder="e.g. New Release"
            value={d.title ?? ""}
          />
        </AdminField>
      </div>
      {isAutomaticRow ? (
        <p className="text-xs text-cocoa-text">
          This row automatically shows your newest products (by publish date), and &ldquo;View all&rdquo; links to /products. Nothing to curate — just upload products.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField>
              <AdminLabel htmlFor={`${idPrefix}-slug`}>Fallback collection slug</AdminLabel>
              <AdminInput
                id={`${idPrefix}-slug`}
                onChange={(e) => onChange({ ...d, collectionSlug: e.target.value })}
                placeholder="e.g. frontpage"
                value={d.collectionSlug ?? ""}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`${idPrefix}-href`}>Fallback &ldquo;View all&rdquo; link href</AdminLabel>
              <AdminInput
                id={`${idPrefix}-href`}
                onChange={(e) => onChange({ ...d, href: e.target.value })}
                placeholder="e.g. /collections/frontpage"
                value={d.href ?? ""}
              />
            </AdminField>
          </div>
          <p className="text-xs text-cocoa-text">
            Assign the live collection in Collections → Homepage placement. These values are used only when no collection owns this row.
          </p>
        </>
      )}
      <AdminField>
        <AdminLabel htmlFor={`${idPrefix}-count`}>Items to show</AdminLabel>
        <AdminInput
          id={`${idPrefix}-count`}
          inputMode="numeric"
          onChange={(e) => onChange({ ...d, itemCount: Number(e.target.value) || 0 })}
          value={String(d.itemCount ?? 4)}
        />
      </AdminField>
    </div>
  );
}
