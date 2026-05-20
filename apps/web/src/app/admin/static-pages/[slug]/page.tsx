"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetStaticPage, adminUpdateStaticPage } from "@/lib/adminApi";
import type { StaticPage } from "@/lib/api";
import { StaticPageForm } from "@/components/admin/StaticPageForm";

export default function AdminStaticPageEdit() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [page, setPage] = useState<StaticPage | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!params.slug) return;
    adminGetStaticPage(params.slug).then(setPage);
  }, [params.slug]);

  if (!page) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="coco-heading mb-6">{page.title}</h1>
      <StaticPageForm
        initial={page}
        onSubmit={async (body) => {
          const updated = await adminUpdateStaticPage(page.slug, body);
          setPage(updated);
          setSavedAt(new Date().toLocaleTimeString());
        }}
        submitLabel="Save changes"
      />
      {savedAt ? <p className="mt-3 text-sm text-cocoa-mint">Saved at {savedAt}</p> : null}
      <button className="mt-8 text-sm underline" onClick={() => router.push("/admin/static-pages")} type="button">← Back</button>
    </div>
  );
}
