"use client";

import { useEffect, useState } from "react";
import {
  adminGetStaticPage,
  adminUpdateStaticPage,
} from "@/lib/adminApi";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPanel,
  AdminTextarea,
} from "@/components/admin/ui";

type Props = {
  /** StaticPage slug (e.g. "about-us", "gallery", "comics", "faq"). */
  slug: string;
  /** Heading shown on the panel. */
  heading?: string;
  /** Subtitle/help text. */
  hint?: string;
};

/**
 * Reusable in-page editor for the StaticPage row that backs a public page's
 * title/intro/blocks. Embed this at the top of any dedicated admin (About,
 * Gallery, Comics, FAQ, etc.) so the page header is editable in the same
 * place as the page's structured content.
 */
export function StaticPageHeaderEditor({ slug, heading = "Page header", hint }: Props) {
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [blocksText, setBlocksText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminGetStaticPage(slug)
      .then((p) => {
        if (cancelled) return;
        setTitle(p.title);
        setIntro(p.intro);
        setBlocksText(p.blocks.join("\n\n"));
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setMissing(true);
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [slug]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const blocks = blocksText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      await adminUpdateStaticPage(slug, { title, intro, blocks });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <AdminPanel className="space-y-3">Loading {heading.toLowerCase()}…</AdminPanel>;
  }

  if (missing) {
    return (
      <AdminPanel className="space-y-3" variant="dashed">
        <h2 className="text-lg font-bold">{heading}</h2>
        <p className="text-sm text-cocoa-text">
          No static-page row found for <code>{slug}</code>. Page header (title / intro / blocks)
          cannot be edited until one exists.
        </p>
      </AdminPanel>
    );
  }

  return (
    <AdminPanel className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{heading}</h2>
        <code className="text-xs text-cocoa-text">{slug}</code>
      </div>
      {hint ? <p className="text-sm text-cocoa-text">{hint}</p> : null}
      <AdminField>
        <AdminLabel htmlFor={`sph-title-${slug}`}>Title</AdminLabel>
        <AdminInput
          id={`sph-title-${slug}`}
          onChange={(e) => setTitle(e.target.value)}
          value={title}
        />
      </AdminField>
      <AdminField>
        <AdminLabel htmlFor={`sph-intro-${slug}`}>Intro</AdminLabel>
        <AdminTextarea
          id={`sph-intro-${slug}`}
          onChange={(e) => setIntro(e.target.value)}
          rows={3}
          value={intro}
        />
      </AdminField>
      <AdminField>
        <AdminLabel htmlFor={`sph-blocks-${slug}`}>
          Body paragraphs <span className="font-normal text-cocoa-text">(blank line = new paragraph)</span>
        </AdminLabel>
        <AdminTextarea
          id={`sph-blocks-${slug}`}
          onChange={(e) => setBlocksText(e.target.value)}
          rows={5}
          value={blocksText}
        />
      </AdminField>
      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}
      <div className="flex items-center gap-3">
        <AdminButton
          className="disabled:opacity-60"
          disabled={saving}
          onClick={save}
          type="button"
          variant="primary"
        >
          {saving ? "Saving…" : "Save page header"}
        </AdminButton>
        {savedAt ? <span className="text-xs text-cocoa-mint">Saved at {savedAt}</span> : null}
      </div>
    </AdminPanel>
  );
}
