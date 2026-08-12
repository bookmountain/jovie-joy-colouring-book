"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminListContent, adminDeleteContent } from "@/lib/adminApi";
import type { ContentBlock } from "@/lib/api";
import { AdminConfirmDialog, AdminPageHeader } from "@/components/admin/ui";
import { notifyDeleted, notifyError } from "@/lib/toast";
import {
  ACTIVE_CONTENT_BLOCK_TYPES,
  retiredContentBlock,
} from "@/lib/content-block-types";

const ORDER = ACTIVE_CONTENT_BLOCK_TYPES;

export default function AdminContentPage() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContentBlock | null>(null);

  function reload() {
    adminListContent().then(setBlocks).catch((e: Error) => setError(e.message));
  }
  useEffect(reload, []);

  async function remove(key: string) {
    try {
      await adminDeleteContent(key);
      notifyDeleted("Block");
      reload();
    } catch (e) {
      notifyError(e);
    } finally {
      setPendingDelete(null);
    }
  }

  if (error) return <p className="text-cocoa-coral">{error}</p>;

  const grouped = ORDER.map((type) => ({
    type,
    items: blocks.filter((b) => b.type === type),
  })).filter((g) => g.items.length > 0);
  const retired = blocks.filter((block) => retiredContentBlock(block.type));

  return (
    <div>
      <AdminPageHeader
        title="Content"
        actions={
          <Link className="admin-btn" data-variant="primary" href="/admin/content/new">
            + New block
          </Link>
        }
      />
      <p className="mt-2 text-sm text-cocoa-text">
        Advanced view of every typed content block. Prefer the dedicated Home, Header,
        Footer, Announcement, About, FAQ, and Featured On editors for normal changes.
        Retired blocks are ignored by the storefront and can only be removed here.
      </p>

      {grouped.length === 0 ? (
        <p className="mt-6 text-cocoa-text">No active content blocks yet.</p>
      ) : (
        grouped.map((g) => (
          <div className="mt-8" key={g.type}>
            <h2 className="text-lg font-bold">{g.type}</h2>
            <ul className="mt-2 space-y-2">
              {g.items.map((b) => (
                <li
                  className="flex items-center justify-between rounded-coco-sm border border-cocoa-line bg-white px-4 py-3"
                  key={b.key}
                >
                  <div>
                    <div className="font-semibold">{b.key}</div>
                    <div className="text-xs text-cocoa-text">
                      Updated {new Date(b.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Link
                      className="text-cocoa-purple underline"
                      href={`/admin/content/${encodeURIComponent(b.key)}`}
                    >
                      Edit
                    </Link>
                    <button
                      className="text-cocoa-coral underline"
                      onClick={() => setPendingDelete(b)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {retired.length > 0 ? (
        <section className="mt-10 rounded-coco-sm border border-cocoa-honey bg-cocoa-cream p-4">
          <h2 className="text-lg font-bold">Retired blocks</h2>
          <p className="mt-1 text-sm text-cocoa-text">
            These records came from an older CMS model and are not rendered. Move any
            useful copy into the linked dedicated editor, then delete the old block.
          </p>
          <ul className="mt-4 space-y-2">
            {retired.map((block) => {
              const replacement = retiredContentBlock(block.type);
              return (
                <li
                  className="flex items-center justify-between rounded-coco-sm border border-cocoa-line bg-white px-4 py-3"
                  key={block.key}
                >
                  <div>
                    <div className="font-semibold">{block.key}</div>
                    <div className="text-xs text-cocoa-text">Retired type: {block.type}</div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Link
                      className="text-cocoa-purple underline"
                      href={`/admin/content/${encodeURIComponent(block.key)}`}
                    >
                      Review legacy data
                    </Link>
                    <Link className="text-cocoa-purple underline" href={replacement.editorHref}>
                      Open {replacement.editorLabel}
                    </Link>
                    <button
                      className="text-cocoa-coral underline"
                      onClick={() => setPendingDelete(block)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <AdminConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.key}"?`}
        body="This content block will be permanently removed from the CMS."
        confirmLabel="Delete block"
        destructive
        onConfirm={() => {
          if (pendingDelete) return remove(pendingDelete.key);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
