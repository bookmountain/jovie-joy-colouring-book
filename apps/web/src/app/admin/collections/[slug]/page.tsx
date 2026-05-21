"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetCollection, adminUpdateCollection } from "@/lib/adminApi";
import type { Collection } from "@/lib/api";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { AdminPageHeader } from "@/components/admin/ui";

export default function AdminCollectionEdit() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!params.slug) return;
    adminGetCollection(params.slug).then(setCollection).catch((e: Error) => setError(e.message));
  }, [params.slug]);

  if (error) return <p className="text-cocoa-coral">{error}</p>;
  if (!collection) return <p>Loading…</p>;

  return (
    <div>
      <AdminPageHeader title={collection.title} />
      <div className="mt-6">
        <CollectionForm
          initial={collection}
          onSubmit={async (body) => {
            const updated = await adminUpdateCollection(collection.slug, body);
            setCollection(updated);
            setSavedAt(new Date().toLocaleTimeString());
          }}
          submitLabel="Save changes"
        />
      </div>
      {savedAt ? <p className="mt-3 text-sm text-cocoa-mint">Saved at {savedAt}</p> : null}
      <button
        className="mt-8 text-sm underline"
        onClick={() => router.push("/admin/collections")}
        type="button"
      >
        ← Back
      </button>
    </div>
  );
}
