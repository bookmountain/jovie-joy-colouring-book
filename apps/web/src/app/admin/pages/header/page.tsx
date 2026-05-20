"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";

export default function AdminHeaderPage() {
  const [draft, setDraft] = useState<unknown>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    adminGetContent("header.brand").then((b) => setDraft(b.data)).catch(() => setDraft({}));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await adminUpsertContent("header.brand", { type: "HeaderBrand", data: draft, sortIndex: 0 });
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="coco-heading">Header</h1>
        <p className="mt-1 text-sm text-cocoa-text">
          Brand text + search placeholder. Navigation tree is edited under{" "}
          <Link className="text-cocoa-purple underline" href="/admin/navigation">/admin/navigation</Link> (Phase 4c).
        </p>
      </header>

      <section className="coco-panel space-y-3 p-6">
        <h2 className="text-lg font-bold">Brand</h2>
        <ContentBlockEditor blockKey="header.brand" type="HeaderBrand" data={draft} onChange={setDraft} />
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
