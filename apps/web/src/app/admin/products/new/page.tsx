"use client";

import { useRouter } from "next/navigation";
import { adminCreateProduct } from "@/lib/adminApi";
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  const router = useRouter();
  return (
    <ProductForm
      submitLabel="Create product"
      onDiscard={() => router.push("/admin/products")}
      onSubmit={async (body) => {
        const created = await adminCreateProduct(body);
        router.push(`/admin/products/${created.slug}`);
      }}
    />
  );
}
