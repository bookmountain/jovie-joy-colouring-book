import { describe, expect, test } from "vitest";
import type { NavLink, SiteContentBundle } from "@/lib/api";
import {
  SITE_MODULES_KEY,
  filterShopNavigation,
  readSiteModules,
  shopIsEnabled,
  shopRouteIsEnabled,
} from "@/lib/site-modules";

function bundleWith(data: unknown): SiteContentBundle {
  return {
    siteModules: [{ key: SITE_MODULES_KEY, type: "SiteModules", data, sortIndex: 0, updatedAt: "" }],
  } as unknown as SiteContentBundle;
}

describe("shopIsEnabled", () => {
  test("defaults to enabled when the block or flag is absent", () => {
    expect(shopIsEnabled(undefined)).toBe(true);
    expect(shopIsEnabled(null)).toBe(true);
    expect(shopIsEnabled({})).toBe(true);
  });

  test("respects an explicit flag", () => {
    expect(shopIsEnabled({ shop: true })).toBe(true);
    expect(shopIsEnabled({ shop: false })).toBe(false);
  });
});

describe("readSiteModules", () => {
  test("reads the site.modules block from the bundle", () => {
    expect(readSiteModules(bundleWith({ shop: false }))).toEqual({ shop: false });
  });

  test("returns an empty object when the bundle has no block", () => {
    expect(readSiteModules({} as unknown as SiteContentBundle)).toEqual({});
  });
});

describe("shopRouteIsEnabled", () => {
  const off = { shop: false };

  test("blocks every commerce route while the shop is off", () => {
    for (const path of [
      "/products", "/products/cozy-days", "/collections", "/collections/digital",
      "/collections/digital/products/cozy-days", "/checkout", "/checkout/success",
      "/search", "/wishlist", "/pages/wishlist",
    ]) {
      expect(shopRouteIsEnabled(off, path)).toBe(false);
    }
  });

  test("keeps content routes reachable while the shop is off", () => {
    for (const path of ["/", "/pages/freebies", "/pages/about-us", "/blogs/htc", "/pages/comics"]) {
      expect(shopRouteIsEnabled(off, path)).toBe(true);
    }
  });

  test("allows everything while the shop is on", () => {
    expect(shopRouteIsEnabled({}, "/products")).toBe(true);
    expect(shopRouteIsEnabled({ shop: true }, "/checkout")).toBe(true);
  });
});

describe("filterShopNavigation", () => {
  const nav: NavLink[] = [
    { id: "1", label: "Home", href: "/", enabled: true, children: [] },
    {
      id: "2", label: "Products", href: "/products", enabled: true,
      children: [{ id: "3", label: "Stickers", href: "/collections/vinyl-sticker-packs", enabled: true, children: [] }],
    },
    {
      id: "4", label: "Freebies", href: "/pages/freebies", enabled: true,
      children: [{ id: "5", label: "Digital Books", href: "/collections/digital", enabled: true, children: [] }],
    },
  ];

  test("removes shop links (including nested children) while the shop is off", () => {
    const filtered = filterShopNavigation(nav, { shop: false });
    expect(filtered.map((item) => item.label)).toEqual(["Home", "Freebies"]);
    expect(filtered[1].children).toEqual([]);
  });

  test("returns navigation untouched while the shop is on", () => {
    expect(filterShopNavigation(nav, {})).toEqual(nav);
  });
});
