"use client";

import { useRef } from "react";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { API_URL } from "@/lib/api";

function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return url;
}

export type SourceLinkValue = {
  label: string;
  href: string;
  image?: string;
  alt?: string;
};

export type AdminSourceLinksEditorProps = {
  value: SourceLinkValue[];
  onChange: (next: SourceLinkValue[]) => void;
  upload: (file: File) => Promise<{ url: string }>;
};

export function AdminSourceLinksEditor({ value, onChange, upload }: AdminSourceLinksEditorProps) {
  function patch(idx: number, p: Partial<SourceLinkValue>) {
    const next = value.map((row, i) => (i === idx ? { ...row, ...p } : row));
    onChange(next);
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function add() {
    onChange([...value, { label: "", href: "", image: undefined, alt: undefined }]);
  }

  return (
    <div>
      {value.map((row, idx) => (
        <SourceRow key={idx} idx={idx} row={row} patch={patch} remove={remove} upload={upload} resolveImageUrl={resolveImageUrl} />
      ))}
      <div style={{ paddingTop: 14 }}>
        <AdminButton variant="ghost" size="sm" onClick={add}>+ Add source link</AdminButton>
      </div>
    </div>
  );
}

function SourceRow({
  idx, row, patch, remove, upload, resolveImageUrl,
}: {
  idx: number;
  row: SourceLinkValue;
  patch: (i: number, p: Partial<SourceLinkValue>) => void;
  remove: (i: number) => void;
  upload: (f: File) => Promise<{ url: string }>;
  resolveImageUrl: (u: string) => string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const { url } = await upload(f);
    patch(idx, { image: url });
  }

  return (
    <div className="admin-source-row">
      <div
        className="img-cell"
        role="button"
        tabIndex={0}
        aria-label="upload source-link image"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
      >
        {row.image
          ? <img alt={row.alt ?? ""} src={resolveImageUrl(row.image)} />
          : <span>+ image</span>}
      </div>
      <AdminInput aria-label="label" placeholder="Penguin Random House" value={row.label} onChange={(e) => patch(idx, { label: e.target.value })} />
      <AdminInput aria-label="url" placeholder="https://example.com" value={row.href} onChange={(e) => patch(idx, { href: e.target.value })} />
      <AdminInput aria-label="alt text" placeholder="Buy on Penguin US" value={row.alt ?? ""} onChange={(e) => patch(idx, { alt: e.target.value })} />
      <button type="button" className="remove" aria-label="remove source link" onClick={() => remove(idx)}>×</button>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPick} />
    </div>
  );
}
