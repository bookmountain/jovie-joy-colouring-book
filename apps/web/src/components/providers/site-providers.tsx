"use client";

import { BundleProvider } from "@/state/catalog-provider";
import { SiteProvider } from "@/state/site-store";
import type { SiteContentBundle } from "@/lib/api";
import type { ReactNode } from "react";

export function SiteProviders({ bundle, children }: { bundle: SiteContentBundle; children: ReactNode }) {
  return (
    <BundleProvider bundle={bundle}>
      <SiteProvider>{children}</SiteProvider>
    </BundleProvider>
  );
}
