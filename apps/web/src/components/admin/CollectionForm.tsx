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
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPanel,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/ui";

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
    // Fetch the full catalog (not the default 25/page) so every product is
    // pickable from the "Add product" picker, including stores with hundreds
    // of items where the cap would otherwise hide most of them.
    adminListProducts({ pageSize: 1000 })
      .then((r) => setAllProducts(r.items as unknown as Product[]))
      .catch((e: Error) => setError(e.message));
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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <AdminPanel className="space-y-4">
        {!initial ? (
          <AdminField>
            <AdminLabel htmlFor="col-slug">Slug</AdminLabel>
            <AdminInput
              id="col-slug"
              onChange={(e) => setSlug(e.target.value)}
              required
              value={slug}
            />
          </AdminField>
        ) : null}
        <AdminField>
          <AdminLabel htmlFor="col-title">Title</AdminLabel>
          <AdminInput
            id="col-title"
            onChange={(e) => setTitle(e.target.value)}
            required
            value={title}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="col-excerpt">Excerpt</AdminLabel>
          <AdminTextarea
            id="col-excerpt"
            onChange={(e) => setExcerpt(e.target.value)}
            required
            rows={2}
            value={excerpt}
          />
        </AdminField>
        <div className="grid gap-4 sm:grid-cols-3">
          <AdminField>
            <AdminLabel htmlFor="col-sort">Default sort</AdminLabel>
            <AdminSelect
              id="col-sort"
              onChange={(e) => setDefaultSort(e.target.value)}
              value={defaultSort}
            >
              {SORT_KEYS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField>
            <AdminLabel htmlFor="col-slot">Homepage slot</AdminLabel>
            <AdminSelect
              id="col-slot"
              onChange={(e) => setHomepageSlot(e.target.value)}
              value={homepageSlot}
            >
              {HOMEPAGE_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s || "none"}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField>
            <AdminLabel htmlFor="col-sortindex">Sort index</AdminLabel>
            <AdminInput
              id="col-sortindex"
              onChange={(e) => setSortIndex(Number(e.target.value))}
              type="number"
              value={sortIndex}
            />
          </AdminField>
        </div>
      </AdminPanel>

      <AdminPanel>
        <ImageUpload label="Hero image" onChange={setHeroImage} upload={uploadHero} value={heroImage} />
      </AdminPanel>

      <AdminPanel className="space-y-3">
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
      </AdminPanel>

      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}
      <AdminButton
        className="disabled:opacity-60"
        disabled={submitting}
        type="submit"
        variant="primary"
      >
        {submitting ? "Saving…" : submitLabel}
      </AdminButton>
    </form>
  );
}
