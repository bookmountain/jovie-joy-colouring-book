"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreateCollection,
  adminDeleteCollection,
  adminListCollections,
} from "@/lib/adminApi";
import type { Collection } from "@/lib/api";
import { CollectionForm } from "@/components/admin/CollectionForm";

export default function AdminCollectionsList() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function reload() {
    adminListCollections().then(setCollections).catch((e: Error) => setError(e.message));
  }
  useEffect(reload, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="coco-heading">Collections</h1>
        <button
          className="coco-button-primary"
          onClick={() => setShowCreate(!showCreate)}
          type="button"
        >
          {showCreate ? "Cancel" : "+ New collection"}
        </button>
      </div>
      {error ? <p className="mt-3 text-cocoa-coral">{error}</p> : null}
      {showCreate ? (
        <div className="mt-6">
          <CollectionForm
            onSubmit={async (body) => {
              const created = await adminCreateCollection(body);
              router.push(`/admin/collections/${created.slug}`);
            }}
            submitLabel="Create"
          />
        </div>
      ) : null}
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-cocoa-line text-left text-cocoa-text">
            <th className="py-2">Title</th>
            <th className="py-2">Slug</th>
            <th className="py-2">Sort</th>
            <th className="py-2">Slot</th>
            <th className="py-2">Products</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {collections.map((c) => (
            <tr className="border-b border-cocoa-line" key={c.slug}>
              <td className="py-2 font-semibold">{c.title}</td>
              <td className="py-2">
                <code className="text-xs">{c.slug}</code>
              </td>
              <td className="py-2">{c.defaultSort}</td>
              <td className="py-2">{c.homepageSlot ?? "—"}</td>
              <td className="py-2">{c.productSlugs.length}</td>
              <td className="py-2 text-right">
                <Link className="mr-3 text-cocoa-purple underline" href={`/admin/collections/${c.slug}`}>
                  Edit
                </Link>
                <button
                  className="text-cocoa-coral underline"
                  onClick={async () => {
                    if (!window.confirm(`Delete ${c.slug}?`)) return;
                    await adminDeleteCollection(c.slug);
                    reload();
                  }}
                  type="button"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
