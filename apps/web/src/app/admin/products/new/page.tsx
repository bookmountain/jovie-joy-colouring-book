"use client";

import { useRouter } from "next/navigation";
import { adminCreateProduct } from "@/lib/adminApi";
import { ProductForm } from "@/components/admin/ProductForm";
import { notifySaved, notifyError } from "@/lib/toast";

export default function NewProductPage() {
  const router = useRouter();
  return (
    <ProductForm
      submitLabel="Create product"
      onDiscard={() => router.push("/admin/products")}
      onSubmit={async (body) => {
        try {
          const created = await adminCreateProduct(body);
          notifySaved("Product");
          router.push(`/admin/products/${created.slug}`);
        } catch (e) {
          notifyError(e);
          throw e;
        }
      }}
    />
  );
}
