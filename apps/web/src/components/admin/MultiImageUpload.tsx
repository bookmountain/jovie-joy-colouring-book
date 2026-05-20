"use client";

import { useRef, useState } from "react";

export type MultiImageUploadProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  upload: (file: File) => Promise<{ url: string }>;
  label?: string;
};

export function MultiImageUpload({ value, onChange, upload, label }: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(files: FileList) {
    setError(null);
    setBusy(true);
    try {
      const next: string[] = [...value];
      for (const f of Array.from(files)) {
        const { url } = await upload(f);
        next.push(url);
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function move(idx: number, delta: number) {
    const next = [...value];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {label ? <span className="block text-sm font-semibold">{label}</span> : null}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((url, idx) => (
          <div className="group relative rounded-coco-sm border border-cocoa-line bg-white p-1" key={`${url}-${idx}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="aspect-square w-full rounded-sm object-cover" src={url} />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-cocoa-ink/70 p-1 text-[10px] text-cocoa-cream opacity-0 group-hover:opacity-100">
              <button disabled={idx === 0} onClick={() => move(idx, -1)} type="button">
                ←
              </button>
              <button className="text-cocoa-coral" onClick={() => remove(idx)} type="button">
                ×
              </button>
              <button disabled={idx === value.length - 1} onClick={() => move(idx, 1)} type="button">
                →
              </button>
            </div>
          </div>
        ))}
        <button
          className="flex aspect-square items-center justify-center rounded-coco-sm border border-dashed border-cocoa-line text-xs text-cocoa-text hover:bg-cocoa-cream"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {busy ? "Uploading…" : "+ Add"}
        </button>
      </div>
      <input
        accept="image/*"
        className="hidden"
        multiple
        onChange={(e) => {
          const fs = e.target.files;
          if (fs && fs.length > 0) void handlePick(fs);
          e.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      {error ? <p className="text-xs text-cocoa-coral">{error}</p> : null}
    </div>
  );
}
