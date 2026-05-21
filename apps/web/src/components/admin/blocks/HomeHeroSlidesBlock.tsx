"use client";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { adminUploadContentImage } from "@/lib/adminApi";
import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminButton, AdminField, AdminInput, AdminLabel, AdminPanel } from "@/components/admin/ui";

type Slide = {
  label: string;
  href: string;
  image: string;
};

type Data = {
  intervalMs?: number;
  slides?: Slide[];
};

const EMPTY_SLIDE: Slide = { label: "", href: "", image: "" };

// Tolerate the legacy { desktop, mobile } shape — prefer desktop if image is missing.
function normalizeSlide(s: unknown): Slide {
  const raw = (s ?? {}) as { label?: string; href?: string; image?: string; desktop?: string; mobile?: string };
  return {
    label: raw.label ?? "",
    href: raw.href ?? "",
    image: raw.image || raw.desktop || raw.mobile || "",
  };
}

export function HomeHeroSlidesBlock({ blockKey, data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  const slides: Slide[] = (d.slides ?? []).map(normalizeSlide);
  const interval = d.intervalMs ?? 5000;

  function update(next: Partial<Data>) {
    onChange({ intervalMs: interval, slides, ...next });
  }

  function setSlide(idx: number, patch: Partial<Slide>) {
    update({ slides: slides.map((s, i) => (i === idx ? { ...s, ...patch } : s)) });
  }

  function addSlide() {
    update({ slides: [...slides, { ...EMPTY_SLIDE }] });
  }

  function removeSlide(idx: number) {
    update({ slides: slides.filter((_, i) => i !== idx) });
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[idx], next[target]] = [next[target], next[idx]];
    update({ slides: next });
  }

  return (
    <div className="space-y-4">
      <AdminField>
        <AdminLabel htmlFor="hhs-interval">Auto-rotate interval (ms)</AdminLabel>
        <AdminInput
          id="hhs-interval"
          inputMode="numeric"
          onChange={(e) => update({ intervalMs: Number(e.target.value) || 0 })}
          value={String(interval)}
        />
      </AdminField>

      {slides.length === 0 ? (
        <p className="text-sm text-cocoa-text">
          No slides yet. Add one to start populating the homepage hero carousel.
        </p>
      ) : null}

      {slides.map((slide, idx) => (
        <AdminPanel className="space-y-4" key={idx}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Slide {idx + 1}</h3>
            <div className="flex items-center gap-2">
              <AdminButton
                disabled={idx === 0}
                onClick={() => move(idx, -1)}
                size="sm"
                type="button"
                variant="ghost"
              >
                ↑
              </AdminButton>
              <AdminButton
                disabled={idx === slides.length - 1}
                onClick={() => move(idx, 1)}
                size="sm"
                type="button"
                variant="ghost"
              >
                ↓
              </AdminButton>
              <button
                className="text-xs text-cocoa-coral underline"
                onClick={() => {
                  if (confirm(`Remove slide ${idx + 1}?`)) removeSlide(idx);
                }}
                type="button"
              >
                Remove
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField>
              <AdminLabel htmlFor={`hhs-label-${idx}`}>Label (alt text)</AdminLabel>
              <AdminInput
                id={`hhs-label-${idx}`}
                onChange={(e) => setSlide(idx, { label: e.target.value })}
                value={slide.label}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`hhs-href-${idx}`}>Link href</AdminLabel>
              <AdminInput
                id={`hhs-href-${idx}`}
                onChange={(e) => setSlide(idx, { href: e.target.value })}
                value={slide.href}
              />
            </AdminField>
          </div>

          <ImageUpload
            label="Image"
            onChange={(url) => setSlide(idx, { image: url ?? "" })}
            upload={(f) => adminUploadContentImage(blockKey, f)}
            value={slide.image || null}
            variant="banner"
          />
        </AdminPanel>
      ))}

      <AdminButton onClick={addSlide} type="button" variant="ghost">
        + Add slide
      </AdminButton>
    </div>
  );
}
