"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminGetProduct, adminUpdateProduct, adminUploadProductPdf } from "@/lib/adminApi";
import type { Product } from "@/lib/api";
import { ProductForm } from "@/components/admin/ProductForm";

export default function AdminProductEdit() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!params.slug) return;
    adminGetProduct(params.slug).then(setProduct).catch((e: Error) => setError(e.message));
  }, [params.slug]);

  async function handlePdfUpload() {
    if (!pdfFile || !product) return;
    setPdfBusy(true);
    try {
      const updated = await adminUploadProductPdf(product.slug, pdfFile);
      setProduct(updated);
      setPdfFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF upload failed");
    } finally {
      setPdfBusy(false);
    }
  }

  if (error) return <p className="text-cocoa-coral">{error}</p>;
  if (!product) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="coco-heading mb-6">{product.title}</h1>

      <ProductForm
        initial={product}
        onSubmit={async (body) => {
          const updated = await adminUpdateProduct(product.slug, body);
          setProduct(updated);
          setSavedAt(new Date().toLocaleTimeString());
        }}
        submitLabel="Save changes"
      />

      {savedAt ? <p className="mt-3 text-sm text-cocoa-mint">Saved at {savedAt}</p> : null}

      <div className="coco-panel mt-8 p-6">
        <h2 className="mb-3 text-lg font-bold">PDF (digital fulfilment)</h2>
        {product.pdfPath ? (
          <p className="mb-3 text-sm">
            Current: <code>{product.pdfPath}</code>
          </p>
        ) : null}
        <input
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
          type="file"
        />
        <button
          className="coco-button-secondary ml-3 disabled:opacity-50"
          disabled={!pdfFile || pdfBusy}
          onClick={handlePdfUpload}
          type="button"
        >
          {pdfBusy ? "Uploading…" : "Upload PDF"}
        </button>
      </div>

      <button
        className="mt-8 text-sm underline"
        onClick={() => router.push("/admin/products")}
        type="button"
      >
        ← Back to products
      </button>
    </div>
  );
}
