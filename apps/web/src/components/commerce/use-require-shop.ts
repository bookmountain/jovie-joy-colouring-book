"use client";

import { notFound } from "next/navigation";
import { useBundle } from "@/state/catalog-provider";
import { readSiteModules, shopIsEnabled } from "@/lib/site-modules";

// Client-side counterpart of requireNavigationRoute's shop check, for the
// commerce pages that render entirely on the client (checkout, search).
export function useRequireShop(): void {
  const bundle = useBundle();
  if (!shopIsEnabled(readSiteModules(bundle))) notFound();
}
