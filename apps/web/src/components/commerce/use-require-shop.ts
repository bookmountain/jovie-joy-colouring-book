"use client";

import { notFound } from "next/navigation";
import { useBundle } from "@/state/catalog-provider";
import { cartIsEnabled, readSiteModules } from "@/lib/site-modules";

// Client-side counterpart of requireNavigationRoute's cart check, for the
// checkout pages that render entirely on the client.
export function useRequireCart(): void {
  const bundle = useBundle();
  if (!cartIsEnabled(readSiteModules(bundle))) notFound();
}
