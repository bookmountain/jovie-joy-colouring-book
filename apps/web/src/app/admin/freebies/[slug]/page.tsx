"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetFreebie, type FreebieAdmin } from "@/lib/freebies";
import { FreebieForm } from "@/components/admin/freebie/FreebieForm";
import { FreebieRequestsPanel } from "@/components/admin/freebie/FreebieRequestsPanel";
import { AdminPageHeader } from "@/components/admin/ui";

export default function EditFreebiePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const router = useRouter();
  const [data, setData] = useState<FreebieAdmin | null>(null);

  const refresh = useCallback(async () => {
    if (!slug) return;
    setData(await adminGetFreebie(slug));
  }, [slug]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!data) return <div className="p-8 text-cocoa-muted">Loading…</div>;

  return (
    <div className="space-y-8">
      <AdminPageHeader title={data.title} subtitle={`Freebie · ${data.slug}`} />
      <FreebieForm initial={data} onSaved={refresh} onDeleted={() => router.push("/admin/freebies")} />
      <FreebieRequestsPanel slug={data.slug} />
    </div>
  );
}
