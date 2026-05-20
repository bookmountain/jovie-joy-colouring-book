"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/api";
import {
  adminListCollections,
  adminUploadProductImage,
  adminUploadGeneral,
  type AdminProductWriteBody,
} from "@/lib/adminApi";
import { MultiImageUpload } from "@/components/admin/MultiImageUpload";

const PRODUCT_TYPES = ["physical", "digital", "sticker", "freebie"] as const;

type Props = {
  initial?: Product;
  onSubmit: (body: AdminProductWriteBody) => Promise<void>;
  submitLabel: string;
};

export function ProductForm({ initial, onSubmit, submitLabel }: Props) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [description, setDescription] = useState(initial?.description.join("\n\n") ?? "");
  const [priceCents, setPriceCents] = useState(initial?.priceCents ?? 0);
  const [compareCents, setCompareCents] = useState(initial?.compareAtPriceCents ?? 0);
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [productType, setProductType] = useState<string>(initial?.productType ?? "physical");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [collectionSlugs, setCollectionSlugs] = useState<string[]>(initial?.collections ?? []);
  const [publishedAt, setPublishedAt] = useState(initial?.publishedAt?.slice(0, 10) ?? "");

  const [allCollections, setAllCollections] = useState<{ slug: string; title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminListCollections().then((cs) =>
      setAllCollections(cs.map((c) => ({ slug: c.slug, title: c.title }))),
    );
  }, []);

  const uploadImage = initial
    ? (file: File) => adminUploadProductImage(initial.slug, file)
    : (file: File) => adminUploadGeneral(file, "products");

  function toggleCollection(s: string) {
    setCollectionSlugs((cs) => (cs.includes(s) ? cs.filter((x) => x !== s) : [...cs, s]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body: AdminProductWriteBody = {
        slug: initial ? undefined : slug,
        title,
        excerpt,
        description: description.split(/\n\n+/).map((s) => s.trim()).filter(Boolean),
        priceCents: Number(priceCents),
        compareAtPriceCents: Number(compareCents) > 0 ? Number(compareCents) : null,
        available,
        productType,
        images,
        options: initial?.options ?? [{ name: "Format", values: ["Default Title"] }],
        sourceLinks: initial?.sourceLinks ?? null,
        reviewImages: initial?.reviewImages ?? null,
        inspirationImages: initial?.inspirationImages ?? null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        collectionSlugs,
        publishedAt: publishedAt || null,
      };
      await onSubmit(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="coco-panel space-y-4 p-6">
        {!initial ? (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Slug</span>
            <input
              className="coco-input w-full"
              onChange={(e) => setSlug(e.target.value)}
              required
              value={slug}
            />
          </label>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Title</span>
          <input
            className="coco-input w-full"
            onChange={(e) => setTitle(e.target.value)}
            required
            value={title}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Excerpt</span>
          <textarea
            className="coco-input w-full"
            onChange={(e) => setExcerpt(e.target.value)}
            required
            rows={2}
            value={excerpt}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">
            Description (separate paragraphs with blank lines)
          </span>
          <textarea
            className="coco-input w-full"
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            value={description}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            <span className="mb-1 block text-sm font-semibold">Price (cents)</span>
            <input
              className="coco-input w-full"
              min={0}
              onChange={(e) => setPriceCents(Number(e.target.value))}
              required
              type="number"
              value={priceCents}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold">Compare-at (cents)</span>
            <input
              className="coco-input w-full"
              min={0}
              onChange={(e) => setCompareCents(Number(e.target.value))}
              type="number"
              value={compareCents ?? 0}
            />
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold">Product type</span>
            <select
              className="coco-input w-full"
              onChange={(e) => setProductType(e.target.value)}
              value={productType}
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            type="checkbox"
          />
          <span className="text-sm font-semibold">Available</span>
        </label>
      </div>

      <div className="coco-panel p-6">
        <MultiImageUpload
          label="Product images"
          onChange={setImages}
          upload={uploadImage}
          value={images}
        />
      </div>

      <div className="coco-panel space-y-4 p-6">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Tags (comma-separated)</span>
          <input
            className="coco-input w-full"
            onChange={(e) => setTags(e.target.value)}
            value={tags}
          />
        </label>
        <div>
          <span className="mb-2 block text-sm font-semibold">Collections</span>
          <div className="flex flex-wrap gap-2">
            {allCollections.map((c) => {
              const on = collectionSlugs.includes(c.slug);
              return (
                <button
                  className={`rounded-full border px-3 py-1 text-sm ${
                    on
                      ? "border-cocoa-ink bg-cocoa-ink text-cocoa-cream"
                      : "border-cocoa-line bg-white text-cocoa-text"
                  }`}
                  key={c.slug}
                  onClick={() => toggleCollection(c.slug)}
                  type="button"
                >
                  {c.title}
                </button>
              );
            })}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Published at</span>
          <input
            className="coco-input"
            onChange={(e) => setPublishedAt(e.target.value)}
            type="date"
            value={publishedAt}
          />
        </label>
      </div>

      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}
      <button
        className="coco-button-primary disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
