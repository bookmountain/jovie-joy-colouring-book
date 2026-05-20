"use client";

import { useEffect, useState } from "react";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";

export default function AdminAnnouncementPage() {
  const [draft, setDraft] = useState<unknown>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    adminGetContent("announcement.bar").then((b) => setDraft(b.data)).catch(() => setDraft({ enabled: false, text: "", href: "" }));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await adminUpsertContent("announcement.bar", { type: "Announcement", data: draft, sortIndex: 0 });
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="coco-heading">Announcement bar</h1>
        <p className="mt-1 text-sm text-cocoa-text">The thin lavender bar at the top of every storefront page.</p>
      </header>
      <section className="coco-panel space-y-3 p-6">
        <ContentBlockEditor blockKey="announcement.bar" type="Announcement" data={draft} onChange={setDraft} />
        <div className="flex items-center gap-3">
          <button className="coco-button-primary disabled:opacity-60" disabled={saving} onClick={save} type="button">
            {saving ? "Saving…" : "Save"}
          </button>
          {savedAt ? <span className="text-xs text-cocoa-mint">Saved at {savedAt}</span> : null}
        </div>
      </section>
    </div>
  );
}
