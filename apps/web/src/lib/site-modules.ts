import type { SiteContentBundle } from "@/lib/api";
import { normalizeNavigationPath } from "@/lib/navigation-visibility";

export const SITE_MODULES_KEY = "site.modules";

export type SiteModules = {
  /** On-site buying: add to cart, cart drawer, checkout. */
  cart?: boolean;
  /** Customer accounts: Google sign-in and the account menu. */
  accounts?: boolean;
  /** Legacy single flag; both modules fall back to it when set. */
  shop?: boolean;
};

// Only checkout is unreachable without the cart. Products, collections,
// search and wishlist stay browsable so the catalogue still works as a
// shop window that sends buyers to the retailer links on each product.
const CART_ROUTE_PREFIXES = ["/checkout"];

export function readSiteModules(bundle: SiteContentBundle): SiteModules {
  return (bundle.siteModules?.find((block) => block.key === SITE_MODULES_KEY)?.data ?? {}) as SiteModules;
}

export function cartIsEnabled(modules: SiteModules | null | undefined): boolean {
  return modules?.cart ?? modules?.shop ?? true;
}

export function accountsAreEnabled(modules: SiteModules | null | undefined): boolean {
  return modules?.accounts ?? modules?.shop ?? true;
}

export function cartRouteIsEnabled(modules: SiteModules | null | undefined, href: string): boolean {
  if (cartIsEnabled(modules)) return true;
  const path = normalizeNavigationPath(href);
  if (!path) return true;
  return !CART_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
