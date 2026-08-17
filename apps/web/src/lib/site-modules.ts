import type { NavLink, SiteContentBundle } from "@/lib/api";
import { normalizeNavigationPath } from "@/lib/navigation-visibility";

export const SITE_MODULES_KEY = "site.modules";

export type SiteModules = { shop?: boolean };

// Storefront routes that only make sense while the shop module is on.
const SHOP_ROUTE_PREFIXES = [
  "/products",
  "/collections",
  "/checkout",
  "/search",
  "/wishlist",
  "/pages/wishlist",
];

export function readSiteModules(bundle: SiteContentBundle): SiteModules {
  return (bundle.siteModules?.find((block) => block.key === SITE_MODULES_KEY)?.data ?? {}) as SiteModules;
}

// Absence means enabled so environments without the toggle block keep the
// full storefront; the API seeds the block with shop off.
export function shopIsEnabled(modules: SiteModules | null | undefined): boolean {
  return modules?.shop !== false;
}

export function shopRouteIsEnabled(modules: SiteModules | null | undefined, href: string): boolean {
  if (shopIsEnabled(modules)) return true;
  const path = normalizeNavigationPath(href);
  if (!path) return true;
  return !SHOP_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function filterShopNavigation(items: NavLink[], modules: SiteModules | null | undefined): NavLink[] {
  if (shopIsEnabled(modules)) return items;
  return items.flatMap((item) => shopRouteIsEnabled(modules, item.href)
    ? [{ ...item, children: filterShopNavigation(item.children ?? [], modules) }]
    : []);
}
