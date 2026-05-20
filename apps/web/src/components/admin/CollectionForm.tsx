"use client";

import { useEffect, useState } from "react";
import type { Collection, Product } from "@/lib/api";
import {
  adminListProducts,
  adminUploadCollectionHero,
  adminUploadGeneral,
  type AdminCollectionWriteBody,
} from "@/lib/adminApi";
import { ImageUpload } from "@/components/admin/ImageUpload";

const SORT_KEYS = [
  "featured", "relevance", "bestselling",
  "titleascending", "titledescending",
  "priceascending", "pricedescending",
  "createdascending", "createddescending",
] as const;

const HOMEPAGE_SLOTS = ["", "newrelease", "bestseller", "digital", "tile"] as const;

type Props = {
  initial?: Collection;
  onSubmit: (body: AdminCollectionWriteBody) => Promise<void>;
  submitLabel: string;
};

export function CollectionForm({ initial, onSubmit, submitLabel }: Props) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [heroImage, setHeroImage] = useState<string | null>(initial?.heroImage ?? null);
  const [defaultSort, setDefaultSort] = useState<string>(initial?.defaultSort ?? "titleascending");
  const [homepageSlot, setHomepageSlot] = useState<string>(initial?.homepageSlot ?? "");
  const [sortIndex, setSortIndex] = useState(initial?.sortIndex ?? 0);
  const [productOrder, setProductOrder] = useState<string[]>(initial?.productSlugs ?? []);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminListProducts().then(setAllProducts).catch((e: Error) => setError(e.message));
  }, []);

  const uploadHero = initial
    ? (file: File) => adminUploadCollectionHero(initial.slug, file)
    : (file: File) => adminUploadGeneral(file, "collections");

  function toggleProduct(s: string) {
    setProductOrder((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  }
  function move(idx: number, delta: number) {
    const next = [...productOrder];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setProductOrder(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body: AdminCollectionWriteBody = {
        slug: initial ? undefined : slug,
        title,
        excerpt,
        heroImage,
        defaultSort,
        homepageSlot: homepageSlot || null,
        productOrder,
        sortIndex: Number(sortIndex),
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
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            <span className="mb-1 block text-sm font-semibold">Default sort</span>
            <select
              className="coco-input w-full"
              onChange={(e) => setDefaultSort(e.target.value)}
              value={defaultSort}
            >
              {SORT_KEYS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold">Homepage slot</span>
            <select
              className="coco-input w-full"
              onChange={(e) => setHomepageSlot(e.target.value)}
              value={homepageSlot}
            >
              {HOMEPAGE_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s || "none"}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-semibold">Sort index</span>
            <input
              className="coco-input w-full"
              onChange={(e) => setSortIndex(Number(e.target.value))}
              type="number"
              value={sortIndex}
            />
          </label>
        </div>
      </div>

      <div className="coco-panel p-6">
        <ImageUpload label="Hero image" onChange={setHeroImage} upload={uploadHero} value={heroImage} />
      </div>

      <div className="coco-panel space-y-3 p-6">
        <span className="block text-sm font-semibold">
          Products in this collection (in order)
        </span>
        <ol className="space-y-1 text-sm">
          {productOrder.map((s, idx) => {
            const p = allProducts.find((pp) => pp.slug === s);
            return (
              <li className="flex items-center gap-2" key={s}>
                <button disabled={idx === 0} onClick={() => move(idx, -1)} type="button">
                  ↑
                </button>
                <button
                  disabled={idx === productOrder.length - 1}
                  onClick={() => move(idx, 1)}
                  type="button"
                >
                  ↓
                </button>
                <span className="flex-1">{p?.title ?? s}</span>
                <button
                  className="text-cocoa-coral"
                  onClick={() => toggleProduct(s)}
                  type="button"
                >
                  remove
                </button>
              </li>
            );
          })}
        </ol>
        <details>
          <summary className="cursor-pointer text-sm text-cocoa-purple">Add product</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {allProducts
              .filter((p) => !productOrder.includes(p.slug))
              .map((p) => (
                <button
                  className="rounded-full border border-cocoa-line bg-white px-3 py-1 text-xs"
                  key={p.slug}
                  onClick={() => toggleProduct(p.slug)}
                  type="button"
                >
                  {p.title}
                </button>
              ))}
          </div>
        </details>
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
