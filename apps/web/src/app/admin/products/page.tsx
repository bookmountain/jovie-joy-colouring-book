"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateProduct, adminDeleteProduct, adminListProducts } from "@/lib/adminApi";
import type { Product } from "@/lib/api";
import { formatCents } from "@/lib/format";
import { ProductForm } from "@/components/admin/ProductForm";

export default function AdminProductsList() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function reload() {
    adminListProducts().then(setProducts).catch((e: Error) => setError(e.message));
  }
  useEffect(reload, []);

  async function handleDelete(slug: string) {
    if (!window.confirm(`Soft-delete ${slug}?`)) return;
    await adminDeleteProduct(slug);
    reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="coco-heading">Products</h1>
        <button
          className="coco-button-primary"
          onClick={() => setShowCreate(!showCreate)}
          type="button"
        >
          {showCreate ? "Cancel" : "+ New product"}
        </button>
      </div>

      {error ? <p className="mt-3 text-cocoa-coral">{error}</p> : null}

      {showCreate ? (
        <div className="mt-6">
          <ProductForm
            onSubmit={async (body) => {
              const created = await adminCreateProduct(body);
              router.push(`/admin/products/${created.slug}`);
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
            <th className="py-2">Type</th>
            <th className="py-2">Price</th>
            <th className="py-2">Available</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr className="border-b border-cocoa-line" key={p.slug}>
              <td className="py-2 font-semibold">{p.title}</td>
              <td className="py-2">
                <code className="text-xs">{p.slug}</code>
              </td>
              <td className="py-2">{p.productType}</td>
              <td className="py-2">{formatCents(p.priceCents)}</td>
              <td className="py-2">{p.available ? "✓" : "—"}</td>
              <td className="py-2 text-right">
                <Link className="mr-3 text-cocoa-purple underline" href={`/admin/products/${p.slug}`}>
                  Edit
                </Link>
                <button
                  className="text-cocoa-coral underline"
                  onClick={() => handleDelete(p.slug)}
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
