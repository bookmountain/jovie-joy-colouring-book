import { describe, expect, it } from "vitest";
import { initialSiteState, siteReducer } from "@/state/site-store";

describe("site store reducer", () => {
  it("adds cart items and increments existing quantities", () => {
    const first = siteReducer(initialSiteState, {
      type: "cart/add",
      item: {
        productSlug: "comfy-corner-coloring-book",
        title: "Comfy Corner Coloring Book",
        price: 9.99,
        quantity: 1,
      },
    });
    const second = siteReducer(first, {
      type: "cart/add",
      item: {
        productSlug: "comfy-corner-coloring-book",
        title: "Comfy Corner Coloring Book",
        price: 9.99,
        quantity: 2,
      },
    });
    expect(second.cart.items[0].quantity).toBe(3);
  });

  it("toggles wishlist product ids", () => {
    const added = siteReducer(initialSiteState, {
      type: "wishlist/toggle",
      productSlug: "cozy-friends-coloring-book",
    });
    const removed = siteReducer(added, {
      type: "wishlist/toggle",
      productSlug: "cozy-friends-coloring-book",
    });
    expect(added.wishlist).toContain("cozy-friends-coloring-book");
    expect(removed.wishlist).not.toContain("cozy-friends-coloring-book");
  });

  it("stores recently viewed products without duplicates", () => {
    const state = siteReducer(
      siteReducer(initialSiteState, {
        type: "recentlyViewed/add",
        productSlug: "cozy-days-coloring-book",
      }),
      { type: "recentlyViewed/add", productSlug: "cozy-days-coloring-book" },
    );
    expect(state.recentlyViewed).toEqual(["cozy-days-coloring-book"]);
  });
});
