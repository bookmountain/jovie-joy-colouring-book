"use client";

import { useEffect, useState } from "react";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";

export default function AdminNewsletterPage() {
  const [draft, setDraft] = useState<unknown>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    adminGetContent("newsletter.copy").then((b) => setDraft(b.data)).catch(() => setDraft({}));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await adminUpsertContent("newsletter.copy", { type: "NewsletterCopy", data: draft, sortIndex: 0 });
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="coco-heading">Newsletter copy</h1>
        <p className="mt-1 text-sm text-cocoa-text">Heading, CTA label, and success message for the newsletter sign-up.</p>
      </header>
      <section className="coco-panel space-y-3 p-6">
        <ContentBlockEditor blockKey="newsletter.copy" type="NewsletterCopy" data={draft} onChange={setDraft} />
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
