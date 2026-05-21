"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  adminDeleteProduct,
  adminGetProduct,
  adminUpdateProduct,
} from "@/lib/adminApi";
import type { Product } from "@/lib/api";
import { ProductForm } from "@/components/admin/ProductForm";

export default function AdminProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const slug = (params?.slug as string) ?? "";
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    adminGetProduct(slug).then(setProduct).catch((e: Error) => setError(e.message));
  }, [slug]);

  if (error) return <p>{error}</p>;
  if (!product) return <p>Loading…</p>;

  return (
    <ProductForm
      initial={product}
      submitLabel="Save changes"
      onSubmit={async (body) => {
        const updated = await adminUpdateProduct(product.slug, body);
        setProduct(updated);
      }}
      onDiscard={() => router.refresh()}
      onDelete={async () => {
        await adminDeleteProduct(product.slug);
        router.push("/admin/products");
      }}
    />
  );
}
