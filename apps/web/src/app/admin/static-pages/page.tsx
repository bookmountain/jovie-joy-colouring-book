"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateStaticPage, adminDeleteStaticPage, adminListStaticPages } from "@/lib/adminApi";
import type { StaticPage } from "@/lib/api";
import { StaticPageForm } from "@/components/admin/StaticPageForm";

export default function AdminStaticPagesList() {
  const router = useRouter();
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  function reload() {
    adminListStaticPages().then(setPages);
  }
  useEffect(reload, []);

  async function handleDelete(slug: string) {
    if (!confirm(`Delete ${slug}?`)) return;
    await adminDeleteStaticPage(slug);
    reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="coco-heading">Static pages</h1>
        <button className="coco-button-primary" onClick={() => setShowCreate(!showCreate)} type="button">
          {showCreate ? "Cancel" : "+ New page"}
        </button>
      </div>
      {showCreate ? (
        <div className="mt-6">
          <StaticPageForm
            onSubmit={async (body) => {
              const created = await adminCreateStaticPage(body);
              router.push(`/admin/static-pages/${created.slug}`);
            }}
            submitLabel="Create"
          />
        </div>
      ) : null}
      <table className="mt-6 w-full text-sm">
        <thead><tr className="border-b border-cocoa-line text-left text-cocoa-text"><th className="py-2">Slug</th><th>Title</th><th>Blocks</th><th /></tr></thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.slug} className="border-b border-cocoa-line">
              <td className="py-2"><code className="text-xs">{p.slug}</code></td>
              <td>{p.title}</td>
              <td>{p.blocks.length}</td>
              <td className="text-right">
                <Link className="mr-3 text-cocoa-purple underline" href={`/admin/static-pages/${p.slug}`}>Edit</Link>
                <button className="text-cocoa-coral underline" onClick={() => handleDelete(p.slug)} type="button">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
