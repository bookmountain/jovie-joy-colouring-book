"use client";

import { useEffect, useState } from "react";
import {
  adminListFaqs,
  adminCreateFaq,
  adminUpdateFaq,
  adminDeleteFaq,
  adminGetContent,
  adminUpsertContent,
  type AdminFaq,
} from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";
import { StaticPageHeaderEditor } from "@/components/admin/StaticPageHeaderEditor";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPageHeader,
  AdminPanel,
  AdminTextarea,
} from "@/components/admin/ui";

const EMPTY: AdminFaq = { slug: "", question: "", answer: "", group: null, sortIndex: 0 };

export default function AdminFaqPage() {
  const [rows, setRows] = useState<AdminFaq[]>([]);
  const [draft, setDraft] = useState<AdminFaq>({ ...EMPTY });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [artworkDraft, setArtworkDraft] = useState<unknown>({});
  const [artworkSaving, setArtworkSaving] = useState(false);
  const [artworkSavedAt, setArtworkSavedAt] = useState<string | null>(null);

  useEffect(() => {
    adminListFaqs().then(setRows).catch((e: Error) => setError(e.message));
    adminGetContent("hero.artwork.faq")
      .then((b) => setArtworkDraft(b.data))
      .catch(() => setArtworkDraft({}));
  }, []);

  function update(slug: string, patch: Partial<AdminFaq>) {
    setRows((cur) => cur.map((r) => (r.slug === slug ? { ...r, ...patch } : r)));
  }

  async function saveRow(row: AdminFaq) {
    setError(null);
    try {
      const saved = await adminUpdateFaq(row.slug, {
        question: row.question,
        answer: row.answer,
        group: row.group,
        sortIndex: row.sortIndex,
      });
      update(row.slug, saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(slug: string) {
    if (!confirm(`Delete "${slug}"?`)) return;
    setError(null);
    try {
      await adminDeleteFaq(slug);
      setRows((cur) => cur.filter((r) => r.slug !== slug));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function create() {
    setError(null);
    setCreating(true);
    try {
      const created = await adminCreateFaq(draft);
      setRows((cur) => [...cur, created]);
      setDraft({ ...EMPTY });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function saveArtwork() {
    setArtworkSaving(true);
    try {
      await adminUpsertContent("hero.artwork.faq", { type: "HeroArtwork", data: artworkDraft, sortIndex: 0 });
      setArtworkSavedAt(new Date().toLocaleTimeString());
    } finally {
      setArtworkSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="FAQ"
        subtitle="Manage the FAQ list and the illustration shown above it on the homepage."
      />

      <StaticPageHeaderEditor slug="faq" heading="Page header" hint="Title + intro shown on /pages/faq." />

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">FAQ artwork (homepage banner)</h2>
        <ContentBlockEditor blockKey="hero.artwork.faq" type="HeroArtwork" data={artworkDraft} onChange={setArtworkDraft} />
        <div className="flex items-center gap-3">
          <AdminButton
            className="disabled:opacity-60"
            disabled={artworkSaving}
            onClick={saveArtwork}
            type="button"
            variant="primary"
          >
            {artworkSaving ? "Saving…" : "Save artwork"}
          </AdminButton>
          {artworkSavedAt ? <span className="text-xs text-cocoa-mint">Saved at {artworkSavedAt}</span> : null}
        </div>
      </AdminPanel>

      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}

      {rows.map((row) => (
        <AdminPanel className="space-y-3" key={row.slug}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{row.question || row.slug}</h2>
            <code className="text-xs text-cocoa-text">{row.slug}</code>
          </div>
          <AdminField>
            <AdminLabel htmlFor={`q-${row.slug}`}>Question</AdminLabel>
            <AdminInput
              id={`q-${row.slug}`}
              onChange={(e) => update(row.slug, { question: e.target.value })}
              value={row.question}
            />
          </AdminField>
          <AdminField>
            <AdminLabel htmlFor={`a-${row.slug}`}>Answer</AdminLabel>
            <AdminTextarea
              id={`a-${row.slug}`}
              onChange={(e) => update(row.slug, { answer: e.target.value })}
              rows={5}
              value={row.answer}
            />
          </AdminField>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField>
              <AdminLabel htmlFor={`g-${row.slug}`}>Group (optional)</AdminLabel>
              <AdminInput
                id={`g-${row.slug}`}
                onChange={(e) => update(row.slug, { group: e.target.value || null })}
                value={row.group ?? ""}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`s-${row.slug}`}>Sort index</AdminLabel>
              <AdminInput
                id={`s-${row.slug}`}
                inputMode="numeric"
                onChange={(e) => update(row.slug, { sortIndex: Number(e.target.value) || 0 })}
                value={String(row.sortIndex)}
              />
            </AdminField>
          </div>
          <div className="flex items-center gap-3">
            <AdminButton onClick={() => saveRow(row)} type="button" variant="primary">Save</AdminButton>
            <button
              className="text-xs text-cocoa-coral underline"
              onClick={() => remove(row.slug)}
              type="button"
            >
              Delete
            </button>
          </div>
        </AdminPanel>
      ))}

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">Add new FAQ</h2>
        <AdminField>
          <AdminLabel htmlFor="new-slug">Slug (URL-safe id)</AdminLabel>
          <AdminInput
            id="new-slug"
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            placeholder="e.g. shipping-times"
            value={draft.slug}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="new-q">Question</AdminLabel>
          <AdminInput
            id="new-q"
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            value={draft.question}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="new-a">Answer</AdminLabel>
          <AdminTextarea
            id="new-a"
            onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
            rows={4}
            value={draft.answer}
          />
        </AdminField>
        <AdminButton
          disabled={creating || !draft.slug || !draft.question}
          onClick={create}
          type="button"
          variant="primary"
        >
          {creating ? "Creating…" : "Create"}
        </AdminButton>
      </AdminPanel>
    </div>
  );
}
