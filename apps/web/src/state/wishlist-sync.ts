"use client";

import { apiAddWishlist, apiMergeWishlist, apiRemoveWishlist } from "@/lib/api";
import { tokenStorage } from "@/lib/auth";

export async function syncWishlistToggle(productSlug: string, nowInList: boolean) {
  const token = tokenStorage.read();
  if (!token) return;

  try {
    if (nowInList) await apiAddWishlist(token, productSlug);
    else await apiRemoveWishlist(token, productSlug);
  } catch {
    // silent — local state is authoritative for now
  }
}

export async function mergeGuestWishlist(guestSlugs: string[]) {
  const token = tokenStorage.read();
  if (!token || guestSlugs.length === 0) return;
  try {
    await apiMergeWishlist(token, guestSlugs);
  } catch {
    // silent
  }
}
