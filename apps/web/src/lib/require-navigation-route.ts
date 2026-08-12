import { notFound } from "next/navigation";
import { getSiteContent } from "@/data/site-content";
import { navigationRouteIsEnabled } from "@/lib/navigation-visibility";

export async function requireNavigationRoute(path: string): Promise<void> {
  const bundle = await getSiteContent();
  if (!navigationRouteIsEnabled(bundle.navigation, path)) notFound();
}
