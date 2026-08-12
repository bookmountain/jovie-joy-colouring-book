"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetContent, adminUpsertContent } from "@/lib/adminApi";
import type { ContentBlock } from "@/lib/api";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";
import { AdminButton, AdminPanel, AdminPageHeader } from "@/components/admin/ui";
import Link from "next/link";
import { retiredContentBlock } from "@/lib/content-block-types";

export default function AdminContentEditPage() {
  const params = useParams<{ key: string }>();
  const router = useRouter();
  const key = decodeURIComponent(params.key ?? "");
  const [block, setBlock] = useState<ContentBlock | null>(null);
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!key) return;
    adminGetContent(key)
      .then((b) => {
        setBlock(b);
        setData(b.data);
      })
      .catch((e: Error) => setError(e.message));
  }, [key]);

  async function save() {
    if (!block) return;
    setError(null);
    setSubmitting(true);
    try {
      const updated = await adminUpsertContent(block.key, {
        type: block.type,
        data,
        sortIndex: block.sortIndex,
      });
      setBlock(updated);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <p className="text-cocoa-coral">{error}</p>;
  if (!block) return <p>Loading…</p>;

  const replacement = retiredContentBlock(block.type);
  if (replacement) {
    return (
      <div>
        <AdminPageHeader title={block.key} subtitle={<>Retired type: <code>{block.type}</code></>} />
        <AdminPanel className="mt-6 space-y-3">
          <h2 className="text-lg font-bold">This block is no longer rendered</h2>
          <p className="text-sm text-cocoa-text">
            The current storefront reads this content from its dedicated CMS editor.
            Copy anything useful from the read-only legacy data below into that editor,
            then remove this retired record from the Content list.
          </p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-coco-sm border border-cocoa-line bg-white p-3 text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
          <Link className="admin-btn w-fit" data-variant="primary" href={replacement.editorHref}>
            Open {replacement.editorLabel}
          </Link>
        </AdminPanel>
        <button
          className="mt-4 text-sm underline"
          onClick={() => router.push("/admin/content")}
          type="button"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title={block.key} subtitle={<>Type: <code>{block.type}</code></>} />
      <AdminPanel className="mt-6">
        <ContentBlockEditor
          blockKey={block.key}
          data={data}
          onChange={setData}
          type={block.type}
        />
      </AdminPanel>

      {savedAt ? <p className="mt-3 text-sm text-cocoa-mint">Saved at {savedAt}</p> : null}
      <div className="mt-4 flex items-center gap-3">
        <AdminButton
          className="disabled:opacity-60"
          disabled={submitting}
          onClick={save}
          type="button"
          variant="primary"
        >
          {submitting ? "Saving…" : "Save"}
        </AdminButton>
        <button
          className="text-sm underline"
          onClick={() => router.push("/admin/content")}
          type="button"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
