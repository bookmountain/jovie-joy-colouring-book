"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { tokenStorage } from "@/lib/auth";
import { mergeGuestWishlist } from "@/state/wishlist-sync";
import { useSite } from "@/state/site-store";

export default function AuthCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const { state } = useSite();

  useEffect(() => {
    const token = params.get("token");
    const ret = params.get("return") ?? "/";
    if (!token) {
      router.replace("/");
      return;
    }

    tokenStorage.write(token);

    if (state.wishlist.length > 0) void mergeGuestWishlist(state.wishlist);

    setTimeout(() => router.replace(ret), 100);
  }, [params, router, state.wishlist]);

  return (
    <main className="mx-auto max-w-md py-16 text-center">
      <p className="coco-heading">Signing you in…</p>
    </main>
  );
}
