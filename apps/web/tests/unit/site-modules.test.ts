import { describe, expect, test } from "vitest";
import type { SiteContentBundle } from "@/lib/api";
import {
  SITE_MODULES_KEY,
  accountsAreEnabled,
  cartIsEnabled,
  cartRouteIsEnabled,
  readSiteModules,
} from "@/lib/site-modules";

function bundleWith(data: unknown): SiteContentBundle {
  return {
    siteModules: [{ key: SITE_MODULES_KEY, type: "SiteModules", data, sortIndex: 0, updatedAt: "" }],
  } as unknown as SiteContentBundle;
}

describe("cartIsEnabled / accountsAreEnabled", () => {
  test("default to enabled when the block or flags are absent", () => {
    for (const modules of [undefined, null, {}]) {
      expect(cartIsEnabled(modules)).toBe(true);
      expect(accountsAreEnabled(modules)).toBe(true);
    }
  });

  test("respect each flag independently", () => {
    expect(cartIsEnabled({ cart: false, accounts: true })).toBe(false);
    expect(accountsAreEnabled({ cart: false, accounts: true })).toBe(true);
    expect(cartIsEnabled({ cart: true, accounts: false })).toBe(true);
    expect(accountsAreEnabled({ cart: true, accounts: false })).toBe(false);
  });

  test("fall back to the legacy shop flag when the new keys are missing", () => {
    expect(cartIsEnabled({ shop: false })).toBe(false);
    expect(accountsAreEnabled({ shop: false })).toBe(false);
    expect(cartIsEnabled({ shop: true })).toBe(true);
  });

  test("prefer an explicit new flag over the legacy one", () => {
    expect(cartIsEnabled({ shop: true, cart: false })).toBe(false);
    expect(accountsAreEnabled({ shop: false, accounts: true })).toBe(true);
  });
});

describe("readSiteModules", () => {
  test("reads the site.modules block from the bundle", () => {
    expect(readSiteModules(bundleWith({ cart: false, accounts: false })))
      .toEqual({ cart: false, accounts: false });
  });

  test("returns an empty object when the bundle has no block", () => {
    expect(readSiteModules({} as unknown as SiteContentBundle)).toEqual({});
  });
});

describe("cartRouteIsEnabled", () => {
  const off = { cart: false };

  test("blocks only checkout while the cart is off", () => {
    expect(cartRouteIsEnabled(off, "/checkout")).toBe(false);
    expect(cartRouteIsEnabled(off, "/checkout/success")).toBe(false);
  });

  test("keeps the catalogue browsable while the cart is off", () => {
    for (const path of [
      "/", "/products", "/products/soft-life-with-zoebook", "/collections",
      "/collections/digital", "/search", "/wishlist", "/pages/wishlist",
      "/pages/freebies", "/blogs/htc",
    ]) {
      expect(cartRouteIsEnabled(off, path)).toBe(true);
    }
  });

  test("allows everything while the cart is on", () => {
    expect(cartRouteIsEnabled({}, "/checkout")).toBe(true);
    expect(cartRouteIsEnabled({ cart: true }, "/checkout")).toBe(true);
  });
});
