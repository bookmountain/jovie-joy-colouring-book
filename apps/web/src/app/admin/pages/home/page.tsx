"use client";

import { useEffect, useState } from "react";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";
import type { ContentBlock } from "@/lib/api";
import { AdminButton, AdminPanel, AdminPageHeader } from "@/components/admin/ui";

const SECTIONS: { key: string; type: string; label: string; help?: string }[] = [
  { key: "home.hero.slides", type: "HomeHeroSlides", label: "Hero carousel", help: "Top-of-page rotating banner. Each slide needs desktop + mobile images." },
  { key: "home.intro", type: "HomeIntro", label: "Hi Friend! panel" },
  { key: "home.video", type: "HomeVideo", label: "Home video" },
  { key: "home.cozy-moments.header", type: "HomeCozyMomentsHeader", label: "Cozy Moments heading", help: "Images for the grid are managed in /admin/gallery." },
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
      <AdminPageHeader
        title="Home page"
        subtitle="Edit the home page sections. Order on this page matches the live storefront top-to-bottom."
      />

      {SECTIONS.map((s) => {
        const item = state[s.key];
        if (!item) return <AdminPanel key={s.key}>Loading {s.label}…</AdminPanel>;
        return (
          <AdminPanel key={s.key} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{s.label}</h2>
              <code className="text-xs text-cocoa-text">{s.key}</code>
            </div>
            {s.help ? <p className="text-sm text-cocoa-text">{s.help}</p> : null}
            <ContentBlockEditor
              blockKey={s.key}
              type={s.type}
              data={item.draft}
              onChange={(draft) => setState((prev) => ({ ...prev, [s.key]: { ...prev[s.key], draft } }))}
            />
            {item.error ? <p className="text-sm text-cocoa-coral">{item.error}</p> : null}
            <div className="flex items-center gap-3">
              <AdminButton
                className="disabled:opacity-60"
                disabled={item.saving}
                onClick={() => save(s)}
                type="button"
                variant="primary"
              >
                {item.saving ? "Saving…" : "Save"}
              </AdminButton>
              {item.savedAt ? <span className="text-xs text-cocoa-mint">Saved at {item.savedAt}</span> : null}
            </div>
          </AdminPanel>
        );
      })}
    </div>
  );
}
