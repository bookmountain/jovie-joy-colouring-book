import { describe, expect, test } from "vitest";
import {
  getRelatedProducts,
  normalizeCollectionSlug,
  searchCatalog,
  sortProducts,
  takePageSize,
} from "@/lib/catalog";
import type { Product } from "@/lib/api";

const sample = (
  slug: string,
  priceCents: number,
  title = slug,
  tags: string[] = [],
  collections: string[] = [],
): Product => ({
  id: slug,
  slug,
  title,
  excerpt: "",
  description: [],
  priceCents,
  compareAtPriceCents: null,
  available: true,
  productType: "physical",
  images: [],
  options: [],
  sourceLinks: null,
  reviewImages: null,
  inspirationImages: null,
  tags,
  collections,
  publishedAt: "2025-01-01",
  pdfPath: null,
});

describe("catalog helpers", () => {
  test("sortProducts: price-ascending", () => {
    const result = sortProducts(
      [sample("a", 300), sample("b", 100), sample("c", 200)],
      "price-ascending",
    );
    expect(result.map((p) => p.slug)).toEqual(["b", "c", "a"]);
  });

  test("sortProducts: title-descending", () => {
    const result = sortProducts(
      [sample("a", 100, "Apple"), sample("b", 100, "Zebra")],
      "title-descending",
    );
    expect(result[0].title).toBe("Zebra");
  });

  test("searchCatalog: matches title case-insensitively", () => {
    const result = searchCatalog(
      [
        sample("cozy", 100, "Cozy Christmas"),
        sample("ocean", 100, "Ocean Day"),
      ],
      "CHRISTMAS",
    );
    expect(result.map((p) => p.slug)).toEqual(["cozy"]);
  });

  test("searchCatalog: empty query returns empty", () => {
    expect(searchCatalog([sample("a", 100)], "  ")).toEqual([]);
  });

  test("normalizeCollectionSlug: paperback alias", () => {
    expect(normalizeCollectionSlug("paperback")).toBe("paperback-coloring-book");
    expect(normalizeCollectionSlug("digital")).toBe("digital");
  });

  test("takePageSize: respects pageSize", () => {
    const items = [sample("a", 1), sample("b", 1), sample("c", 1)];
    expect(takePageSize(items, 2)).toHaveLength(2);
    expect(takePageSize(items, 0)).toHaveLength(0);
  });

  test("getRelatedProducts: ranks by shared collections and tags", () => {
    const target = sample("target", 100, "T", ["a", "b"], ["x", "y"]);
    const close = sample("close", 100, "C", ["a"], ["x", "y"]);
    const far = sample("far", 100, "F", [], ["z"]);
    const result = getRelatedProducts([target, close, far], target, 5);
    expect(result[0].slug).toBe("close");
  });

  test("getRelatedProducts: excludes the target itself", () => {
    const target = sample("target", 100);
    const other = sample("other", 100);
    const result = getRelatedProducts([target, other], target, 5);
    expect(result.map((p) => p.slug)).not.toContain("target");
  });
});
