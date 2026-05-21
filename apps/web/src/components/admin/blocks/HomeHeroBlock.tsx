"use client";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { adminUploadContentImage } from "@/lib/adminApi";
import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminField, AdminInput, AdminLabel, AdminTextarea } from "@/components/admin/ui";

type Data = {
  eyebrow?: string;
  title?: string;
  subtext?: string;
  ctaLabel?: string;
  ctaHref?: string;
  image?: string;
};

export function HomeHeroBlock({ blockKey, data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <AdminField>
        <AdminLabel htmlFor="hh-eyebrow">Eyebrow</AdminLabel>
        <AdminInput
          id="hh-eyebrow"
          onChange={(e) => onChange({ ...d, eyebrow: e.target.value })}
          value={d.eyebrow ?? ""}
        />
      </AdminField>
      <AdminField>
        <AdminLabel htmlFor="hh-title">Title</AdminLabel>
        <AdminInput
          id="hh-title"
          onChange={(e) => onChange({ ...d, title: e.target.value })}
          value={d.title ?? ""}
        />
      </AdminField>
      <AdminField>
        <AdminLabel htmlFor="hh-subtext">Subtext</AdminLabel>
        <AdminTextarea
          id="hh-subtext"
          onChange={(e) => onChange({ ...d, subtext: e.target.value })}
          rows={3}
          value={d.subtext ?? ""}
        />
      </AdminField>
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField>
          <AdminLabel htmlFor="hh-cta-label">CTA label</AdminLabel>
          <AdminInput
            id="hh-cta-label"
            onChange={(e) => onChange({ ...d, ctaLabel: e.target.value })}
            value={d.ctaLabel ?? ""}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="hh-cta-href">CTA href</AdminLabel>
          <AdminInput
            id="hh-cta-href"
            onChange={(e) => onChange({ ...d, ctaHref: e.target.value })}
            value={d.ctaHref ?? ""}
          />
        </AdminField>
      </div>
      <ImageUpload
        label="Hero image"
        onChange={(url) => onChange({ ...d, image: url ?? undefined })}
        upload={(f) => adminUploadContentImage(blockKey, f)}
        value={d.image ?? null}
      />
    </div>
  );
}
