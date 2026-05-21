"use client";

import { useRef, useState } from "react";
import { resolveAssetUrl } from "@/lib/api";
import { AdminButton } from "@/components/admin/ui";

export type ImageUploadProps = {
  value?: string | null;
  onChange: (url: string | null) => void;
  upload: (file: File) => Promise<{ url: string }>;
  label?: string;
  accept?: string;
  /**
   * "compact" (default) — small square thumbnail + buttons on the right.
   * "banner"            — full-width wide preview + buttons beneath. Use for
   *                        hero slides and other banner-shaped assets.
   */
  variant?: "compact" | "banner";
};

export function ImageUpload({
  value,
  onChange,
  upload,
  label,
  accept = "image/*",
  variant = "compact",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(file: File) {
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
  }

  const buttons = (
    <div className="flex items-center gap-3">
      <AdminButton
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        type="button"
        variant="ghost"
      >
        {busy ? "Uploading…" : value ? "Replace" : "Upload"}
      </AdminButton>
      {value ? (
        <button
          className="text-xs text-cocoa-coral underline"
          onClick={() => onChange(null)}
          type="button"
        >
          Remove
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-2">
      {label ? <span className="block text-sm font-semibold">{label}</span> : null}

      {variant === "banner" ? (
        <div className="space-y-3">
          <div className="relative w-full overflow-hidden rounded-coco-sm border border-cocoa-line bg-white" style={{ aspectRatio: "2 / 1" }}>
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Uploaded asset"
                className="absolute inset-0 h-full w-full object-cover"
                src={resolveAssetUrl(value)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center border border-dashed border-cocoa-line text-xs text-cocoa-text">
                No image — Upload a banner (recommended ~2:1 aspect ratio)
              </div>
            )}
          </div>
          {buttons}
        </div>
      ) : (
        <div className="flex items-start gap-4">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Uploaded asset"
              className="h-24 w-24 rounded-coco-sm border border-cocoa-line object-cover"
              src={resolveAssetUrl(value)}
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-coco-sm border border-dashed border-cocoa-line text-xs text-cocoa-text">
              No image
            </div>
          )}
          <div className="space-y-2">
            <AdminButton
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              type="button"
              variant="ghost"
            >
              {busy ? "Uploading…" : value ? "Replace" : "Upload"}
            </AdminButton>
            {value ? (
              <button
                className="block text-xs text-cocoa-coral underline"
                onClick={() => onChange(null)}
                type="button"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      )}

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
    </div>
  );
}
