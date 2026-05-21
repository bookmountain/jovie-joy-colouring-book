"use client";

import { useState } from "react";
import type { StaticPage } from "@/lib/api";
import type { AdminStaticPageWriteBody } from "@/lib/adminApi";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPanel,
  AdminTextarea,
} from "@/components/admin/ui";

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
    <form className="space-y-4" onSubmit={handleSubmit}>
      <AdminPanel className="space-y-4">
        {!initial ? (
          <AdminField>
            <AdminLabel htmlFor="sp-slug">Slug</AdminLabel>
            <AdminInput id="sp-slug" onChange={(e) => setSlug(e.target.value)} required value={slug} />
          </AdminField>
        ) : null}
        <AdminField>
          <AdminLabel htmlFor="sp-title">Title</AdminLabel>
          <AdminInput id="sp-title" onChange={(e) => setTitle(e.target.value)} required value={title} />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="sp-intro">Intro</AdminLabel>
          <AdminTextarea id="sp-intro" onChange={(e) => setIntro(e.target.value)} required rows={2} value={intro} />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="sp-blocks">Blocks (separate paragraphs with blank lines)</AdminLabel>
          <AdminTextarea id="sp-blocks" onChange={(e) => setBlocks(e.target.value)} rows={10} value={blocks} />
        </AdminField>
      </AdminPanel>
      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}
      <AdminButton className="disabled:opacity-60" disabled={submitting} type="submit" variant="primary">
        {submitting ? "Saving…" : submitLabel}
      </AdminButton>
    </form>
  );
}
