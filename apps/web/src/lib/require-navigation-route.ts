import { notFound } from "next/navigation";
import { getSiteContent } from "@/data/site-content";
import { navigationRouteIsEnabled } from "@/lib/navigation-visibility";
import { readSiteModules, shopRouteIsEnabled } from "@/lib/site-modules";

export async function requireNavigationRoute(path: string): Promise<void> {
  const bundle = await getSiteContent();
  if (!shopRouteIsEnabled(readSiteModules(bundle), path)) notFound();
  if (!navigationRouteIsEnabled(bundle.navigation, path)) notFound();
}
