"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useSite } from "@/state/site-store";

export function BackInStockModal() {
  const { state, dispatch } = useSite();
  const [submitted, setSubmitted] = useState(false);

  if (state.activeModal !== "back-in-stock") {
    return null;
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
          Leave your email and we will notify you when this product is back in
          stock.
        </p>
        <form
          className="mt-5 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <input
            className="coco-input"
            placeholder="Your email"
            type="email"
          />
          <button
            className="coco-button-primary"
            type="submit"
          >
            Notify me
          </button>
        </form>
        {submitted ? (
          <p className="mt-4 text-sm font-extrabold">We will keep you posted.</p>
        ) : null}
      </section>
    </div>
  );
}
