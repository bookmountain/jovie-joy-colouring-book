"use client";

import { X } from "lucide-react";
import { useSite } from "@/state/site-store";

export function TermsModal() {
  const { state, dispatch } = useSite();

  if (state.activeModal !== "terms") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-cocoa-ink/35 p-4">
      <section className="w-full max-w-lg rounded-coco bg-cocoa-cream p-6 shadow-drawer">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">Terms & conditions</h2>
          <button
            aria-label="Close terms"
            className="grid h-10 w-10 place-items-center rounded-full border border-cocoa-line bg-white"
            onClick={() => dispatch({ type: "modal/close" })}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm leading-6 text-cocoa-text">
          This local learning clone simulates storefront terms. Replace this
          content before any real use.
        </p>
      </section>
    </div>
  );
}
