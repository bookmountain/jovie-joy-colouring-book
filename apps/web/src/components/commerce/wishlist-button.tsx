"use client";

import { Heart } from "lucide-react";
import { useSite } from "@/state/site-store";

export function WishlistButton({
  productSlug,
  productTitle,
}: {
  productSlug: string;
  productTitle: string;
}) {
  const { state, dispatch } = useSite();
  const active = state.wishlist.includes(productSlug);

  return (
    <button
      aria-pressed={active}
      aria-label={`${active ? "Remove" : "Add"} ${productTitle} ${
        active ? "from" : "to"
      } wishlist`}
      className={`grid h-10 w-10 place-items-center rounded-full border shadow-sm transition ${
        active
          ? "border-cocoa-ink bg-cocoa-ink text-white"
          : "border-cocoa-line bg-white/95 text-[#6c6155] hover:border-cocoa-coral hover:text-cocoa-coral"
      }`}
      onClick={() => dispatch({ type: "wishlist/toggle", productSlug })}
      type="button"
    >
      <Heart
        aria-hidden="true"
        className="h-5 w-5"
        fill={active ? "currentColor" : "none"}
      />
    </button>
  );
}
