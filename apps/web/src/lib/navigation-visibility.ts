import type { NavLink } from "@/lib/api";

const PATH_ALIASES: Record<string, string> = {
  "/pages/faqs": "/pages/faq",
  "/collections/paperback": "/collections/paperback-coloring-book",
  "/blogs/tools-tips": "/blogs/coloring-book-guide",
  "/blogs/lifestyle-diy": "/blogs/diy",
};

const ROUTE_EXEMPTIONS = [
  "/admin",
  "/api",
  "/auth",
  "/checkout",
  "/search",
  "/wishlist",
  "/pages/wishlist",
  "/_next",
  "/uploads",
];

function pathMatches(path: string, target: string): boolean {
  return path === target || path.startsWith(`${target}/`);
}

export function normalizeNavigationPath(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  const withoutQuery = value.split(/[?#]/, 1)[0] || "/";
  let path = withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : withoutQuery;

  for (const [alias, canonical] of Object.entries(PATH_ALIASES)) {
    if (pathMatches(path, alias)) {
      path = `${canonical}${path.slice(alias.length)}`;
      break;
    }
  }
  return path;
}

export function visibleNavigation(items: NavLink[]): NavLink[] {
  return items.flatMap((item) => item.enabled === false
    ? []
    : [{ ...item, children: visibleNavigation(item.children ?? []) }]);
}

type RouteRule = { target: string; enabled: boolean };

function collectRules(items: NavLink[], ancestorEnabled = true): RouteRule[] {
  return items.flatMap((item) => {
    const enabled = ancestorEnabled && item.enabled !== false;
    const target = normalizeNavigationPath(item.href);
    return [
      ...(target && target !== "/" ? [{ target, enabled }] : []),
      ...collectRules(item.children ?? [], enabled),
    ];
  });
}

export function navigationRouteIsEnabled(items: NavLink[], requestedPath: string): boolean {
  const path = normalizeNavigationPath(requestedPath);
  if (!path || path === "/" || ROUTE_EXEMPTIONS.some((prefix) => pathMatches(path, prefix))) {
    return true;
  }

  const matching = collectRules(items).filter((rule) => pathMatches(path, rule.target));
  if (matching.length === 0) return true;

  const mostSpecificLength = Math.max(...matching.map((rule) => rule.target.length));
  return matching
    .filter((rule) => rule.target.length === mostSpecificLength)
    .some((rule) => rule.enabled);
}
