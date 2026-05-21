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
};

export function ImageUpload({ value, onChange, upload, label, accept = "image/*" }: ImageUploadProps) {
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

  return (
    <div className="space-y-2">
      {label ? <span className="block text-sm font-semibold">{label}</span> : null}
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
