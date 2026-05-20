"use client";

import { useEffect, useState } from "react";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";
import type { ContentBlock } from "@/lib/api";

const SECTIONS: { key: string; type: string; label: string }[] = [
  { key: "home.hero", type: "HomeHero", label: "Hero" },
  { key: "home.intro", type: "HomeIntro", label: "Hi Friend! panel" },
  { key: "home.cozy-moments.header", type: "HomeCozyMomentsHeader", label: "Cozy Moments heading" },
  { key: "home.video", type: "HomeVideo", label: "Home video" },
  { key: "hero.artwork.footer", type: "HeroArtwork", label: "Footer artwork (homepage)" },
];

type State = Record<string, { block: ContentBlock | null; draft: unknown; saving: boolean; error: string | null; savedAt: string | null }>;

export default function AdminHomePage() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    Promise.all(SECTIONS.map(async (s) => {
      try {
        const block = await adminGetContent(s.key);
        return [s.key, { block, draft: block.data, saving: false, error: null, savedAt: null }] as const;
      } catch (e: unknown) {
        return [s.key, { block: null, draft: {}, saving: false, error: e instanceof Error ? e.message : "load failed", savedAt: null }] as const;
      }
    })).then((entries) => setState(Object.fromEntries(entries)));
  }, []);

  async function save(s: { key: string; type: string }) {
    setState((prev) => ({ ...prev, [s.key]: { ...prev[s.key], saving: true, error: null } }));
    try {
      const block = await adminUpsertContent(s.key, {
        type: s.type,
        data: state[s.key].draft,
        sortIndex: state[s.key].block?.sortIndex ?? 0,
      });
      setState((prev) => ({ ...prev, [s.key]: { block, draft: block.data, saving: false, error: null, savedAt: new Date().toLocaleTimeString() } }));
    } catch (e: unknown) {
      setState((prev) => ({ ...prev, [s.key]: { ...prev[s.key], saving: false, error: e instanceof Error ? e.message : "save failed" } }));
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="coco-heading">Home page</h1>
        <p className="mt-1 text-sm text-cocoa-text">
          Edit the home page sections. Cozy Moments images come from{" "}
          <a className="text-cocoa-purple underline" href="/admin/gallery">/admin/gallery</a> (Phase 4b).
        </p>
      </header>

      {SECTIONS.map((s) => {
        const item = state[s.key];
        if (!item) return <p key={s.key} className="coco-panel p-6">Loading {s.label}…</p>;
        return (
          <section key={s.key} className="coco-panel space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{s.label}</h2>
              <code className="text-xs text-cocoa-text">{s.key}</code>
            </div>
            <ContentBlockEditor
              blockKey={s.key}
              type={s.type}
              data={item.draft}
              onChange={(draft) => setState((prev) => ({ ...prev, [s.key]: { ...prev[s.key], draft } }))}
            />
            {item.error ? <p className="text-sm text-cocoa-coral">{item.error}</p> : null}
            <div className="flex items-center gap-3">
              <button
                className="coco-button-primary disabled:opacity-60"
                disabled={item.saving}
                onClick={() => save(s)}
                type="button"
              >
                {item.saving ? "Saving…" : "Save"}
              </button>
              {item.savedAt ? <span className="text-xs text-cocoa-mint">Saved at {item.savedAt}</span> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
