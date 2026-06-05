"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminListContent, adminDeleteContent } from "@/lib/adminApi";
import type { ContentBlock } from "@/lib/api";
import { AdminConfirmDialog, AdminPageHeader } from "@/components/admin/ui";
import { notifyDeleted, notifyError } from "@/lib/toast";

const ORDER = [
  "HomeHero",
  "Announcement",
  "HomeVideo",
  "HeroArtwork",
  "AboutSection",
  "FaqEntry",
  "FooterGroup",
  "FeaturedOn",
];

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
        Typed blocks rendered on the storefront: hero, announcement, video, hero artwork.
        AboutSection, FaqEntry, FooterGroup, FeaturedOn types accept raw JSON for now.
      </p>

      {grouped.length === 0 ? (
        <p className="mt-6 text-cocoa-text">No content blocks yet.</p>
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

      <AdminConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.key}"?`}
        body="This content block will be permanently removed from the storefront."
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
