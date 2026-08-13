import type { SortKey } from "@/data/collections";
import type { Product } from "@/lib/api";

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
