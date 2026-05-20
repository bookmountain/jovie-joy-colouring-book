"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminListContent, adminDeleteContent } from "@/lib/adminApi";
import type { ContentBlock } from "@/lib/api";

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

  function reload() {
    adminListContent().then(setBlocks).catch((e: Error) => setError(e.message));
  }
  useEffect(reload, []);

  if (error) return <p className="text-cocoa-coral">{error}</p>;

  const grouped = ORDER.map((type) => ({
    type,
    items: blocks.filter((b) => b.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="coco-heading">Content</h1>
        <Link className="coco-button-primary" href="/admin/content/new">
          + New block
        </Link>
      </div>
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
                      onClick={async () => {
                        if (!window.confirm(`Delete ${b.key}?`)) return;
                        await adminDeleteContent(b.key);
                        reload();
                      }}
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
    </div>
  );
}
