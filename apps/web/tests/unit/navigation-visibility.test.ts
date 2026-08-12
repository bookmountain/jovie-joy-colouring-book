import { describe, expect, it } from "vitest";
import type { NavLink } from "@/lib/api";
import {
  navigationRouteIsEnabled,
  normalizeNavigationPath,
  visibleNavigation,
} from "@/lib/navigation-visibility";

function link(
  id: string,
  href: string,
  enabled: boolean,
  children: NavLink[] = [],
): NavLink {
  return { id, label: id, href, enabled, children };
}

describe("navigation visibility", () => {
  it("removes disabled branches while preserving enabled descendants in stored data", () => {
    const tree = [
      link("products", "/products", false, [link("digital", "/collections/digital", true)]),
      link("gallery", "/pages/gallery", true),
    ];

    expect(visibleNavigation(tree).map((item) => item.id)).toEqual(["gallery"]);
    expect(tree[0].children[0].enabled).toBe(true);
  });

  it("blocks exact and descendant routes for a disabled tab", () => {
    const tree = [link("gallery", "/pages/gallery", false)];
    expect(navigationRouteIsEnabled(tree, "/pages/gallery")).toBe(false);
    expect(navigationRouteIsEnabled(tree, "/pages/gallery/detail")).toBe(false);
    expect(navigationRouteIsEnabled(tree, "/pages/gallery-old")).toBe(true);
  });

  it("uses the most specific rule and allows duplicate targets when one is enabled", () => {
    const tree = [
      link("products", "/products", false, [link("special", "/products/special", true)]),
      link("products-copy", "/products", true),
    ];
    expect(navigationRouteIsEnabled(tree, "/products/ordinary")).toBe(true);
    expect(navigationRouteIsEnabled(tree, "/products/special/item")).toBe(false);
  });

  it("canonicalizes aliases so a hidden tab cannot be bypassed", () => {
    expect(normalizeNavigationPath("/pages/faqs?from=header#top")).toBe("/pages/faq");
    expect(navigationRouteIsEnabled(
      [link("faq", "/pages/faqs", false)],
      "/pages/faq",
    )).toBe(false);
    expect(navigationRouteIsEnabled(
      [link("blog", "/blogs/tools-tips", false)],
      "/blogs/coloring-book-guide/article",
    )).toBe(false);
  });

  it("does not turn external links, home, or operational routes into access rules", () => {
    const tree = [
      link("external", "https://example.com/gallery", false),
      link("home", "/", false),
      link("checkout", "/checkout", false),
    ];
    expect(navigationRouteIsEnabled(tree, "/")).toBe(true);
    expect(navigationRouteIsEnabled(tree, "/checkout/success")).toBe(true);
    expect(navigationRouteIsEnabled(tree, "/pages/unlisted")).toBe(true);
  });
});
