"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { apiNotifyMe } from "@/lib/api";
import { useSite } from "@/state/site-store";

type Status = "idle" | "submitting" | "ok" | "error";

export function BackInStockModal() {
  const { state, dispatch } = useSite();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const productSlug = state.recentlyViewed[0];

  if (state.activeModal !== "back-in-stock") {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!productSlug) return;
    if (!email.includes("@")) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      await apiNotifyMe(email, productSlug);
      setStatus("ok");
      setTimeout(() => dispatch({ type: "modal/close" }), 1200);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-cocoa-ink/35 p-4">
      <section className="w-full max-w-md rounded-coco bg-cocoa-cream p-6 shadow-drawer">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">Back In Stock Notification</h2>
          <button
            aria-label="Close back in stock"
            className="grid h-10 w-10 place-items-center rounded-full border border-cocoa-line bg-white"
            onClick={() => dispatch({ type: "modal/close" })}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm leading-6 text-cocoa-text">
          Leave your email and we will notify you when this product is back in stock.
        </p>
        <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
          <input
            className="coco-input"
            disabled={status === "submitting"}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Your email"
            required
            type="email"
            value={email}
          />
          <button
            className="coco-button-primary disabled:opacity-60"
            disabled={status === "submitting" || !productSlug}
            type="submit"
          >
            {status === "submitting" ? "Sending…" : "Notify me"}
          </button>
        </form>
        {status === "ok" ? (
          <p className="mt-4 text-sm font-extrabold">We will keep you posted.</p>
        ) : null}
        {status === "error" ? (
          <p className="mt-4 text-sm font-extrabold text-cocoa-coral">
            Could not save. Check your email and try again.
          </p>
        ) : null}
      </section>
    </div>
  );
}
