"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminUpsertContent } from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPanel,
  AdminPageHeader,
  AdminSelect,
} from "@/components/admin/ui";

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
      <AdminPageHeader title="New content block" />
      <div className="mt-6 space-y-6">
        <AdminPanel className="space-y-4">
          <AdminField>
            <AdminLabel htmlFor="cb-key">
              Key (e.g. <code>about.section.1</code>)
            </AdminLabel>
            <AdminInput
              id="cb-key"
              onChange={(e) => setKey(e.target.value)}
              required
              value={key}
            />
          </AdminField>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField>
              <AdminLabel htmlFor="cb-type">Type</AdminLabel>
              <AdminSelect
                id="cb-type"
                onChange={(e) => setType(e.target.value)}
                value={type}
              >
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor="cb-sortindex">Sort index</AdminLabel>
              <AdminInput
                id="cb-sortindex"
                onChange={(e) => setSortIndex(Number(e.target.value))}
                type="number"
                value={sortIndex}
              />
            </AdminField>
          </div>
        </AdminPanel>

        <AdminPanel>
          <ContentBlockEditor blockKey={key || "new"} data={data} onChange={setData} type={type} />
        </AdminPanel>

        {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}
        <AdminButton
          className="disabled:opacity-60"
          disabled={submitting || !key}
          onClick={save}
          type="button"
          variant="primary"
        >
          {submitting ? "Creating…" : "Create"}
        </AdminButton>
      </div>
    </div>
  );
}
