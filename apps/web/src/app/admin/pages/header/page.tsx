"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";
import { AdminButton, AdminPanel, AdminPageHeader } from "@/components/admin/ui";

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
      <AdminPageHeader
        title="Header"
        subtitle={
          <>
            Brand text + search placeholder. Navigation tree is edited under{" "}
            <Link className="text-cocoa-purple underline" href="/admin/navigation">/admin/navigation</Link> (Phase 4c).
          </>
        }
      />

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">Brand</h2>
        <ContentBlockEditor blockKey="header.brand" type="HeaderBrand" data={draft} onChange={setDraft} />
        <div className="flex items-center gap-3">
          <AdminButton className="disabled:opacity-60" disabled={saving} onClick={save} type="button" variant="primary">
            {saving ? "Saving…" : "Save"}
          </AdminButton>
          {savedAt ? <span className="text-xs text-cocoa-mint">Saved at {savedAt}</span> : null}
        </div>
      </AdminPanel>
    </div>
  );
}
