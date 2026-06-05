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
import { AdminButton, AdminConfirmDialog, AdminPageHeader } from "@/components/admin/ui";
import { notifyDeleted, notifyError } from "@/lib/toast";

export default function AdminCollectionsList() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Collection | null>(null);

  function reload() {
    adminListCollections().then(setCollections).catch((e: Error) => setError(e.message));
  }
  useEffect(reload, []);

  async function remove(slug: string) {
    try {
      await adminDeleteCollection(slug);
      notifyDeleted("Collection");
      reload();
    } catch (e) {
      notifyError(e);
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Collections"
        actions={
          <AdminButton
            onClick={() => setShowCreate(!showCreate)}
            type="button"
            variant="primary"
          >
            {showCreate ? "Cancel" : "+ New collection"}
          </AdminButton>
        }
      />
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
                  onClick={() => setPendingDelete(c)}
                  type="button"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AdminConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.title || pendingDelete?.slug}"?`}
        body="This collection will be removed. Products in it are not deleted."
        confirmLabel="Delete collection"
        destructive
        onConfirm={() => {
          if (pendingDelete) return remove(pendingDelete.slug);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
