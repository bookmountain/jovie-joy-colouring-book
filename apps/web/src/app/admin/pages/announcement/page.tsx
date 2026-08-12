"use client";

import { useEffect, useState } from "react";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";
import { AdminButton, AdminPanel, AdminPageHeader } from "@/components/admin/ui";
import { notifyError } from "@/lib/toast";

export default function AdminAnnouncementPage() {
  const [draft, setDraft] = useState<unknown>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminGetContent("announcement.bar")
      .then((b) => setDraft(b.data))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await adminUpsertContent("announcement.bar", { type: "Announcement", data: draft, sortIndex: 0 });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Save failed";
      setError(message);
      notifyError(reason);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Announcement bar"
        subtitle="The thin lavender bar at the top of every storefront page."
      />
      <AdminPanel className="space-y-3">
        <ContentBlockEditor blockKey="announcement.bar" type="Announcement" data={draft} onChange={setDraft} />
        {error ? <p className="text-sm text-cocoa-coral" role="alert">{error}</p> : null}
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
