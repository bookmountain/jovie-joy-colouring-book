import { describe, expect, it } from "vitest";
import {
  getCollectionBySlug,
  getProductBySlug,
  getProductsForCollection,
  searchCatalog,
  sortProducts,
  takePageSize,
} from "@/lib/catalog";

describe("catalog helpers", () => {
  it("finds products by route slug", () => {
    expect(getProductBySlug("cozy-christmas-coloring-book")?.title).toBe(
      "Cozy Christmas Coloring Book",
    );
  });

  it("finds collection metadata by route slug", () => {
    expect(getCollectionBySlug("frontpage")?.title).toBe("Best Seller");
  });

  it("keeps legacy collection aliases pointed at Coco's public routes", () => {
    expect(getCollectionBySlug("paperback")?.slug).toBe(
      "paperback-coloring-book",
    );
    expect(getProductsForCollection("paperback")).toHaveLength(
      getProductsForCollection("paperback-coloring-book").length,
    );
  });

  it("returns collection products in fixture order", () => {
    const products = getProductsForCollection("frontpage");
    expect(products.map((product) => product.slug)).toContain(
      "cozy-christmas-coloring-book",
    );
  });

  it("sorts by price from low to high", () => {
    const products = getProductsForCollection("all");
    const sorted = sortProducts(products, "price-ascending");
    expect(sorted[0].price).toBeLessThanOrEqual(sorted.at(-1)!.price);
  });

  it("limits product count with selected page size", () => {
    expect(takePageSize(getProductsForCollection("all"), 4)).toHaveLength(4);
  });

  it("searches titles, tags, and excerpts case-insensitively", () => {
    expect(searchCatalog("christmas").map((product) => product.slug)).toContain(
      "cozy-christmas-coloring-book",
    );
  });
});
