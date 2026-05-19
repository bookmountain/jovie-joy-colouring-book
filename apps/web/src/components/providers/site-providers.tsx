"use client";

import { SiteProvider } from "@/state/site-store";

export function SiteProviders({ children }: { children: React.ReactNode }) {
  return <SiteProvider>{children}</SiteProvider>;
}
