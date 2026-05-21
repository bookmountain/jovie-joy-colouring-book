"use client";

import { useEffect, useState } from "react";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";
import { AdminButton, AdminPanel, AdminPageHeader } from "@/components/admin/ui";

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
      <AdminPageHeader
        title="Newsletter copy"
        subtitle="Heading, CTA label, and success message for the newsletter sign-up."
      />
      <AdminPanel className="space-y-3">
        <ContentBlockEditor blockKey="newsletter.copy" type="NewsletterCopy" data={draft} onChange={setDraft} />
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
