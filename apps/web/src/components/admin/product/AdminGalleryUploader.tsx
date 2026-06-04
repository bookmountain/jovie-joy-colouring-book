"use client";

import { useRef, useState } from "react";
import { AdminAssetImage } from "@/components/admin/AdminAssetImage";

export type AdminGalleryUploaderProps = {
  value: string[];
  onChange: (next: string[]) => void;
  upload: (file: File) => Promise<{ url: string }>;
  emptyHint?: string;
};

export function AdminGalleryUploader({ value, onChange, upload, emptyHint }: AdminGalleryUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(files: FileList) {
    setError(null);
    setBusy(true);
    try {
      const next = [...value];
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

  function setPrimary(idx: number) {
    if (idx === 0) return;
    const next = [...value];
    const [moved] = next.splice(idx, 1);
    next.unshift(moved);
    onChange(next);
  }

  function move(idx: number, delta: number) {
    const target = idx + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div>
      {value.length === 0 && emptyHint ? <p className="panel-hint">{emptyHint}</p> : null}
      <div className="admin-gallery">
        {value.map((url, idx) => (
          <div key={`${url}-${idx}`} className="admin-gallery-thumb" data-primary={idx === 0 ? "true" : undefined}>
            <AdminAssetImage alt={`Gallery image ${idx + 1}`} src={url} />
            <div className="controls">
              {idx !== 0 ? (
                <button type="button" aria-label="set as primary" title="Set as primary" onClick={() => setPrimary(idx)}>★</button>
              ) : null}
              <button type="button" aria-label="move left" title="Move left" disabled={idx === 0} onClick={() => move(idx, -1)}>←</button>
              <button type="button" aria-label="move right" title="Move right" disabled={idx === value.length - 1} onClick={() => move(idx, 1)}>→</button>
              <button type="button" aria-label={`remove image ${idx + 1}`} data-tone="danger" onClick={() => remove(idx)}>×</button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="admin-gallery-add"
          aria-label="upload images"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : "+ Add"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const fs = e.target.files;
          if (fs && fs.length > 0) void handlePick(fs);
          e.target.value = "";
        }}
      />
      {error ? <p style={{ color: "#a3392a", fontSize: 12, marginTop: 6 }}>{error}</p> : null}
    </div>
  );
}
