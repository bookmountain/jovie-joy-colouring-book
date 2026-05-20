"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";

const TYPES = [
  "HomeHero", "Announcement", "HomeVideo", "HeroArtwork",
  "HomeIntro", "HomeCozyMomentsHeader", "FooterContact", "HeaderBrand", "NewsletterCopy",
  "AboutSection", "FaqEntry", "FooterGroup", "FeaturedOn",
];

export default function AdminContentNew() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [sortIndex, setSortIndex] = useState(0);
  const [data, setData] = useState<unknown>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setError(null);
    setSubmitting(true);
    try {
      await adminUpsertContent(key, { type, data, sortIndex });
      router.push(`/admin/content/${encodeURIComponent(key)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="coco-heading mb-6">New content block</h1>
      <div className="coco-panel space-y-4 p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">
            Key (e.g. <code>about.section.1</code>)
          </span>
          <input
            className="coco-input w-full"
            onChange={(e) => setKey(e.target.value)}
            required
            value={key}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-sm font-semibold">Type</span>
            <select
              className="coco-input w-full"
              onChange={(e) => setType(e.target.value)}
              value={type}
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold">Sort index</span>
            <input
              className="coco-input w-full"
              onChange={(e) => setSortIndex(Number(e.target.value))}
              type="number"
              value={sortIndex}
            />
          </label>
        </div>
      </div>

      <div className="coco-panel mt-6 p-6">
        <ContentBlockEditor blockKey={key || "new"} data={data} onChange={setData} type={type} />
      </div>

      {error ? <p className="mt-3 text-sm text-cocoa-coral">{error}</p> : null}
      <button
        className="coco-button-primary mt-4 disabled:opacity-60"
        disabled={submitting || !key}
        onClick={save}
        type="button"
      >
        {submitting ? "Creating…" : "Create"}
      </button>
    </div>
  );
}
