import { apiGetProducts } from "@/lib/api";
import type { Collection, Product } from "@/lib/api";

import { getCollection, type SortKey } from "@/data/collections";
import { getAllProducts, getProduct } from "@/data/products";

export type { Collection, Product, SortKey };

const collectionSlugAliases: Record<string, string> = {
  paperback: "paperback-coloring-book",
};

export function normalizeCollectionSlug(slug: string): string {
  return collectionSlugAliases[slug] ?? slug;
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const product = await getProduct(slug);
  return product ?? undefined;
}

export async function getCollectionBySlug(slug: string): Promise<Collection | undefined> {
  const normalizedSlug = normalizeCollectionSlug(slug);
  const result = await getCollection(normalizedSlug);
  return result?.collection ?? undefined;
}

export async function getProductsForCollection(slug: string): Promise<Product[]> {
  const normalizedSlug = normalizeCollectionSlug(slug);
  const result = await getCollection(normalizedSlug);
  return result?.products ?? [];
}

export function sortProducts(items: Product[], sort: SortKey): Product[] {
  const sorted = [...items];
  switch (sort) {
    case "title-ascending": return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "title-descending": return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "price-ascending": return sorted.sort((a, b) => a.priceCents - b.priceCents);
    case "price-descending": return sorted.sort((a, b) => b.priceCents - a.priceCents);
    case "created-ascending":
      return sorted.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
    case "created-descending":
      return sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    default: return sorted;
  }
}

export function takePageSize(items: Product[], pageSize: number): Product[] {
  return pageSize > 0 ? items.slice(0, pageSize) : [];
}

export function searchCatalog(products: Product[], query: string): Product[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return products.filter((product) =>
    [
      product.title, product.excerpt, product.productType,
      ...product.tags, ...product.collections,
    ].join(" ").toLowerCase().includes(normalized),
  );
}

export async function getPopularProducts(): Promise<Product[]> {
  const slugs = [
    "cozy-christmas-coloring-book",
    "comfy-corner-coloring-book",
    "little-cuddles-coloring-book-spiral-bound-and-sticker-set",
  ];
  const all = await getAllProducts();
  const bySlug = new Map(all.map((p) => [p.slug, p]));
  return slugs.map((s) => bySlug.get(s)).filter((p): p is Product => Boolean(p));
}

export function getRelatedProducts(products: Product[], product: Product, limit = 5): Product[] {
  return products
    .filter((c) => c.slug !== product.slug)
    .map((c) => {
      const sharedCollections = c.collections.filter((coll) => product.collections.includes(coll)).length;
      const sharedTags = c.tags.filter((tag) => product.tags.includes(tag)).length;
      const sameType = c.productType === product.productType ? 1 : 0;
      return { product: c, score: sharedCollections * 3 + sharedTags * 2 + sameType };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.product)
    .slice(0, limit);
}

export async function fetchCatalog(): Promise<Product[]> {
  return apiGetProducts();
}
