"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/state/site-store";
import { apiCreateCheckout } from "@/lib/api";
import { tokenStorage } from "@/lib/auth";
import { formatCents } from "@/lib/format";

export default function CheckoutPage() {
  const { state, cartSubtotal } = useSite();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [promo, setPromo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (state.cart.items.length === 0) {
      router.push("/collections");
      return;
    }
    setSubmitting(true);
    try {
      const token = tokenStorage.read() ?? undefined;
      const resp = await apiCreateCheckout(
        {
          email: email.trim(),
          name: name.trim() || null,
          items: state.cart.items.map((i) => ({ productSlug: i.productSlug, quantity: i.quantity })),
          promoCode: promo.trim() || null,
        },
        token,
      );
      window.location.assign(resp.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 lg:px-8">
      <h1 className="coco-heading mb-6">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Email</span>
            <input
              className="coco-input w-full"
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Name (optional)</span>
            <input
              className="coco-input w-full"
              onChange={(e) => setName(e.target.value)}
              type="text"
              value={name}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Promo code</span>
            <input
              className="coco-input w-full"
              onChange={(e) => setPromo(e.target.value)}
              type="text"
              value={promo}
            />
          </label>
          {error ? <p className="text-cocoa-coral text-sm">{error}</p> : null}
          <button className="coco-button-primary w-full disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? "Redirecting…" : "Continue to payment"}
          </button>
        </form>

        <aside className="rounded-coco border border-cocoa-line bg-white p-6">
          <h2 className="text-lg font-bold">Order summary</h2>
          <ul className="my-4 space-y-2 text-sm">
            {state.cart.items.map((i) => (
              <li className="flex justify-between" key={i.productSlug}>
                <span>{i.title} × {i.quantity}</span>
                <span>{formatCents(i.priceCents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-cocoa-line pt-3 font-semibold">
            <span>Subtotal</span>
            <span>{formatCents(cartSubtotal)}</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
