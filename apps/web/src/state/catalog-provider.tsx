"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteContentBundle } from "@/lib/api";

const ctx = createContext<SiteContentBundle | null>(null);

export function BundleProvider({ bundle, children }: { bundle: SiteContentBundle; children: ReactNode }) {
  return <ctx.Provider value={bundle}>{children}</ctx.Provider>;
}

export function useBundle(): SiteContentBundle {
  const v = useContext(ctx);
  if (!v) throw new Error("useBundle must be inside BundleProvider");
  return v;
}
