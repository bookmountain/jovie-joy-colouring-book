"use client";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { adminUploadContentImage } from "@/lib/adminApi";
import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";

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
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Eyebrow</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, eyebrow: e.target.value })}
          value={d.eyebrow ?? ""}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Title</span>
        <input
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, title: e.target.value })}
          value={d.title ?? ""}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Subtext</span>
        <textarea
          className="coco-input w-full"
          onChange={(e) => onChange({ ...d, subtext: e.target.value })}
          rows={3}
          value={d.subtext ?? ""}
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
          <span className="mb-1 block text-sm font-semibold">CTA href</span>
          <input
            className="coco-input w-full"
            onChange={(e) => onChange({ ...d, ctaHref: e.target.value })}
            value={d.ctaHref ?? ""}
          />
        </label>
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
