"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetStaticPage, adminUpdateStaticPage } from "@/lib/adminApi";
import type { StaticPage } from "@/lib/api";
import { StaticPageForm } from "@/components/admin/StaticPageForm";
import { AdminPageHeader } from "@/components/admin/ui";
import { notifySaved, notifyError } from "@/lib/toast";

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
      <AdminPageHeader title={page.title} />
      <div className="mt-6">
        <StaticPageForm
          initial={page}
          onSubmit={async (body) => {
            try {
              const updated = await adminUpdateStaticPage(page.slug, body);
              setPage(updated);
              setSavedAt(new Date().toLocaleTimeString());
              notifySaved("Page");
            } catch (e) {
              notifyError(e);
              throw e;
            }
          }}
          submitLabel="Save changes"
        />
      </div>
      {savedAt ? <p className="mt-3 text-sm text-cocoa-mint">Saved at {savedAt}</p> : null}
      <button className="mt-8 text-sm underline" onClick={() => router.push("/admin/static-pages")} type="button">← Back</button>
    </div>
  );
}
