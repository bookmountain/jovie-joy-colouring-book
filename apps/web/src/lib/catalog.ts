import { collections, type Collection, type SortKey } from "@/data/collections";
import { products, type Product } from "@/data/products";

export type { Collection, Product, SortKey };

const collectionSlugAliases: Record<string, string> = {
  paperback: "paperback-coloring-book",
};

export function normalizeCollectionSlug(slug: string): string {
  return collectionSlugAliases[slug] ?? slug;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getCollectionBySlug(slug: string): Collection | undefined {
  const normalizedSlug = normalizeCollectionSlug(slug);
  return collections.find((collection) => collection.slug === normalizedSlug);
}

export function getProductsForCollection(slug: string): Product[] {
  const normalizedSlug = normalizeCollectionSlug(slug);
  const collection = getCollectionBySlug(normalizedSlug);

  if (!collection) {
    return [];
  }

  if (normalizedSlug === "all") {
    return products;
  }

  if (collection.productSlugs.length > 0) {
    return collection.productSlugs
      .map(getProductBySlug)
      .filter((product): product is Product => Boolean(product));
  }

  return products.filter((product) =>
    product.collections.includes(normalizedSlug),
  );
}

export function sortProducts(items: Product[], sort: SortKey): Product[] {
  const sorted = [...items];

  switch (sort) {
    case "title-ascending":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "title-descending":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "price-ascending":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-descending":
      return sorted.sort((a, b) => b.price - a.price);
    case "created-ascending":
      return sorted.sort(
        (a, b) =>
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
      );
    case "created-descending":
      return sorted.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    case "best-selling":
    case "featured":
    case "relevance":
    default:
      return sorted;
  }
}

export function takePageSize(items: Product[], pageSize: number): Product[] {
  if (pageSize <= 0) {
    return [];
  }

  return items.slice(0, pageSize);
}

export function searchCatalog(query: string): Product[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  return products.filter((product) => {
    const haystack = [
      product.title,
      product.excerpt,
      product.productType,
      ...product.tags,
      ...product.collections,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export function getPopularProducts(): Product[] {
  return [
    "cozy-christmas-coloring-book",
    "comfy-corner-coloring-book",
    "little-cuddles-coloring-book-spiral-bound-and-sticker-set",
  ]
    .map(getProductBySlug)
    .filter((product): product is Product => Boolean(product));
}

export function getRelatedProducts(product: Product, limit = 5): Product[] {
  return products
    .filter((candidate) => candidate.slug !== product.slug)
    .map((candidate) => {
      const sharedCollections = candidate.collections.filter((collection) =>
        product.collections.includes(collection),
      ).length;
      const sharedTags = candidate.tags.filter((tag) =>
        product.tags.includes(tag),
      ).length;
      const sameType = candidate.productType === product.productType ? 1 : 0;

      return {
        product: candidate,
        score: sharedCollections * 3 + sharedTags * 2 + sameType,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (
        new Date(b.product.publishedAt).getTime() -
        new Date(a.product.publishedAt).getTime()
      );
    })
    .map(({ product: candidate }) => candidate)
    .slice(0, limit);
}
