"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveAssetUrl } from "@/lib/api";
import { AdminButton } from "@/components/admin/ui";

type LightboxMode = "fit" | "actual";

function ImagePreviewLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [mode, setMode] = useState<LightboxMode>("fit");
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") { e.preventDefault(); setMode((m) => (m === "fit" ? "actual" : "fit")); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fit = mode === "fit";

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black/85"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/60 px-4 py-2 text-sm text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-full border border-white/20">
            <button
              aria-pressed={fit}
              className={`px-3 py-1 text-xs font-semibold ${fit ? "bg-white text-cocoa-ink" : "text-white hover:bg-white/10"}`}
              onClick={() => setMode("fit")}
              type="button"
            >
              Fit
            </button>
            <button
              aria-pressed={!fit}
              className={`px-3 py-1 text-xs font-semibold ${!fit ? "bg-white text-cocoa-ink" : "text-white hover:bg-white/10"}`}
              onClick={() => setMode("actual")}
              type="button"
            >
              Actual size
            </button>
          </div>
          {dims ? (
            <span className="text-xs opacity-70">
              {dims.w} × {dims.h}px
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <a
            className="text-xs underline opacity-90 hover:opacity-100"
            href={src}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open original ↗
          </a>
          <button
            aria-label="Close preview"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-lg leading-none hover:bg-white/30"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
      </div>

      <div
        className={`flex flex-1 ${fit ? "items-center justify-center overflow-hidden" : "items-start justify-center overflow-auto"} p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Full-size preview"
          className={fit ? "max-h-full max-w-full object-contain" : "h-auto w-auto max-w-none"}
          onClick={() => setMode((m) => (m === "fit" ? "actual" : "fit"))}
          onLoad={(e) => {
            const img = e.currentTarget;
            setDims({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          src={src}
          style={{ cursor: fit ? "zoom-in" : "zoom-out" }}
        />
      </div>
    </div>
  );
}

export type ImageUploadProps = {
  value?: string | null;
  onChange: (url: string | null) => void;
  upload: (file: File) => Promise<{ url: string }>;
  label?: string;
  accept?: string;
  /**
   * CSS aspect-ratio for the preview frame (e.g. "1 / 1", "2 / 1", "16 / 9").
   * Defaults to "1 / 1" for back-compat with the old square thumbnail.
   */
  aspectRatio?: string;
  /**
   * Back-compat alias: "compact" → 1/1, "banner" → 2/1.
   * Ignored if aspectRatio is provided.
   */
  variant?: "compact" | "banner";
};

function variantToAspect(v: ImageUploadProps["variant"]): string {
  return v === "banner" ? "2 / 1" : "1 / 1";
}

export function ImageUpload({
  value,
  onChange,
  upload,
  label,
  accept = "image/*",
  aspectRatio,
  variant,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewing, setViewing] = useState(false);

  const aspect = aspectRatio ?? variantToAspect(variant);
  const hasValue = Boolean(value);

  const handlePick = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please drop an image file");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { url } = await upload(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }, [upload, onChange]);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handlePick(file);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  }

  function onDragLeave() {
    if (dragOver) setDragOver(false);
  }

  const resolved = value ? resolveAssetUrl(value) : null;

  return (
    <div className="space-y-2">
      {label ? <span className="block text-sm font-semibold">{label}</span> : null}

      <div
        aria-disabled={busy}
        className={`group relative w-full overflow-hidden rounded-coco-sm border bg-white transition ${
          dragOver
            ? "border-cocoa-purple ring-2 ring-cocoa-purple/30"
            : hasValue
              ? "border-cocoa-line"
              : "border-dashed border-cocoa-line hover:border-cocoa-purple"
        } ${busy ? "opacity-60" : "cursor-pointer"}`}
        onClick={() => !busy && inputRef.current?.click()}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        role="button"
        style={{ aspectRatio: aspect }}
        tabIndex={0}
        onKeyDown={(e) => { if (!busy && (e.key === "Enter" || e.key === " ")) inputRef.current?.click(); }}
      >
        {resolved ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="Uploaded asset"
            className="absolute inset-0 h-full w-full object-contain"
            src={resolved}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-4 text-center text-xs text-cocoa-text">
            <span className="text-2xl leading-none" aria-hidden>↑</span>
            <span className="font-semibold">Drop an image here, or click to upload</span>
            <span className="opacity-70">PNG, JPG, WebP, GIF, or SVG</span>
          </div>
        )}

        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm font-semibold text-cocoa-ink">
            Uploading…
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AdminButton
          disabled={busy}
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          type="button"
          variant="ghost"
        >
          {hasValue ? "Replace" : "Upload"}
        </AdminButton>
        {hasValue ? (
          <>
            <button
              className="text-xs text-cocoa-purple underline"
              onClick={(e) => { e.stopPropagation(); setViewing(true); }}
              type="button"
            >
              View full size
            </button>
            <button
              className="text-xs text-cocoa-coral underline"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              type="button"
            >
              Remove
            </button>
          </>
        ) : null}
      </div>

      <input
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handlePick(f);
          e.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      {error ? <p className="text-xs text-cocoa-coral">{error}</p> : null}

      {viewing && resolved ? (
        <ImagePreviewLightbox onClose={() => setViewing(false)} src={resolved} />
      ) : null}
    </div>
  );
}
