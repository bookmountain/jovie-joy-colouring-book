"use client";

import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { googleSignInUrl } from "@/lib/auth";
import { useSite } from "@/state/site-store";

export function LoginModal() {
  const { state, dispatch } = useSite();
  const pathname = usePathname() ?? "/";

  if (state.activeModal !== "login") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-cocoa-ink/35 p-4">
      <section className="w-full max-w-md rounded-coco bg-cocoa-cream p-6 shadow-drawer">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">Sign in</h2>
          <button
            aria-label="Close login"
            className="grid h-10 w-10 place-items-center rounded-full border border-cocoa-line bg-white"
            onClick={() => dispatch({ type: "modal/close" })}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-6 text-sm leading-6 text-cocoa-text">
          Save your wishlist, see your orders, and check out faster.
        </p>
        <a
          className="coco-button-primary block text-center"
          href={googleSignInUrl(pathname)}
        >
          Continue with Google
        </a>
        <div className="mt-6 text-center text-sm">
          <a className="text-cocoa-purple underline" href="/admin/login">
            Admin sign in
          </a>
          <span className="mx-3 text-cocoa-line">·</span>
          <button
            className="text-cocoa-text underline"
            onClick={() => dispatch({ type: "modal/close" })}
            type="button"
          >
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}
