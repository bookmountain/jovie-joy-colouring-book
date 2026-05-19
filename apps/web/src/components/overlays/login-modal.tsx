"use client";

import { X } from "lucide-react";
import { useSite } from "@/state/site-store";

export function LoginModal() {
  const { state, dispatch } = useSite();

  if (state.activeModal !== "login") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-cocoa-ink/35 p-4">
      <section className="w-full max-w-md rounded-coco bg-cocoa-cream p-6 shadow-drawer">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">Login</h2>
          <button
            aria-label="Close login"
            className="grid h-10 w-10 place-items-center rounded-full border border-cocoa-line bg-white"
            onClick={() => dispatch({ type: "modal/close" })}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <form className="grid gap-4">
          <label className="grid gap-2 text-sm font-extrabold">
            Email Address *
            <input
              className="coco-input"
              type="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-extrabold">
            Password *
            <input
              className="coco-input"
              type="password"
            />
          </label>
          <button
            className="coco-button-primary"
            type="button"
          >
            Sign in
          </button>
        </form>
      </section>
    </div>
  );
}
