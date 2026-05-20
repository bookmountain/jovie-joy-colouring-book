"use client";

import { useState } from "react";
import type { StaticPage } from "@/lib/api";
import type { AdminStaticPageWriteBody } from "@/lib/adminApi";

type Props = {
  initial?: StaticPage;
  onSubmit: (body: AdminStaticPageWriteBody) => Promise<void>;
  submitLabel: string;
};

export function StaticPageForm({ initial, onSubmit, submitLabel }: Props) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [intro, setIntro] = useState(initial?.intro ?? "");
  const [blocks, setBlocks] = useState((initial?.blocks ?? []).join("\n\n"));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        slug: initial ? undefined : slug,
        title,
        intro,
        blocks: blocks.split(/\n\n+/).map((s) => s.trim()).filter(Boolean),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="coco-panel space-y-4 p-6" onSubmit={handleSubmit}>
      {!initial ? (
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Slug</span>
          <input className="coco-input w-full" onChange={(e) => setSlug(e.target.value)} required value={slug} />
        </label>
      ) : null}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Title</span>
        <input className="coco-input w-full" onChange={(e) => setTitle(e.target.value)} required value={title} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Intro</span>
        <textarea className="coco-input w-full" onChange={(e) => setIntro(e.target.value)} required rows={2} value={intro} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Blocks (separate paragraphs with blank lines)</span>
        <textarea className="coco-input w-full" onChange={(e) => setBlocks(e.target.value)} rows={10} value={blocks} />
      </label>
      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}
      <button className="coco-button-primary disabled:opacity-60" disabled={submitting} type="submit">
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
