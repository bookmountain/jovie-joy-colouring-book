"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { SafeImage } from "@/components/common/SafeImage";
import { apiCreateCheckout } from "@/lib/api";
import { tokenStorage } from "@/lib/auth";
import { formatCents } from "@/lib/format";
import { useSite } from "@/state/site-store";

export function CartDrawer() {
  const { state, dispatch, cartCount, cartSubtotal } = useSite();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }
    if (state.cart.items.length === 0) return;

    setSubmitting(true);
    try {
      const token = tokenStorage.read() ?? undefined;
      const resp = await apiCreateCheckout(
        {
          email: email.trim(),
          items: state.cart.items.map((item) => ({
            productSlug: item.productSlug,
            quantity: item.quantity,
          })),
        },
        token,
      );
      window.location.assign(resp.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setSubmitting(false);
    }
  }

  if (state.activeDrawer !== "cart") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-cocoa-ink/35">
      <aside className="ml-auto h-full w-[min(92vw,420px)] overflow-y-auto rounded-l-coco bg-cocoa-cream p-6 shadow-drawer">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Shopping cart</h2>
            <p className="text-sm text-cocoa-text">
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            aria-label="Close cart"
            className="grid h-10 w-10 place-items-center rounded-full border border-cocoa-line bg-white"
            onClick={() => dispatch({ type: "drawer/close" })}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {state.cart.items.length === 0 ? (
          <p className="rounded-coco-sm bg-white p-4 text-sm text-cocoa-text">
            Your cart is empty.
          </p>
        ) : (
          <div className="grid gap-4">
            {state.cart.items.map((item) => (
              <div
                className="grid grid-cols-[72px_1fr] gap-3 border-b border-cocoa-line pb-4"
                key={`${item.productSlug}-${item.option ?? "default"}`}
              >
                {item.image ? (
                  <div className="relative aspect-square overflow-hidden rounded-coco-sm bg-cocoa-blush">
                    <SafeImage
                      alt=""
                      className="h-full w-full object-cover"
                      fill
                      sizes="72px"
                      src={item.image}
                    />
                  </div>
                ) : null}
                <div>
                  <p className="text-sm font-extrabold">{item.title}</p>
                  <p className="mt-1 text-xs text-[#777]">
                    Qty {item.quantity}
                  </p>
                  <p className="mt-2 text-sm font-extrabold text-cocoa-purple">
                    {formatCents(item.priceCents * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 text-base font-extrabold">
              <span>Subtotal</span>
              <span>{formatCents(cartSubtotal)}</span>
            </div>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="coco-input w-full"
              disabled={submitting}
            />
            {error && <p className="text-sm text-cocoa-coral">{error}</p>}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting || state.cart.items.length === 0}
              className="coco-button-primary w-full disabled:opacity-60"
            >
              {submitting ? "Redirecting…" : `Checkout · ${formatCents(cartSubtotal)}`}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
