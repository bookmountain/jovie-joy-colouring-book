"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useBundle } from "@/state/catalog-provider";
import { useSite } from "@/state/site-store";

export function MobileMenu() {
  const { state, dispatch } = useSite();
  const bundle = useBundle();
  const primaryNavigation = bundle.navigation;
  const open = state.activeDrawer === "mobile-menu";

  useEffect(() => {
    if (!open) {
      return;
    }

    const hidden: Element[] = [];
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");

    if (main) {
      hidden.push(main);
    }

    if (footer) {
      hidden.push(footer);
    }

    hidden.forEach((element) => element.setAttribute("aria-hidden", "true"));

    return () => {
      hidden.forEach((element) => element.removeAttribute("aria-hidden"));
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-cocoa-ink/35 md:hidden">
      <aside className="h-full w-[min(88vw,380px)] overflow-y-auto rounded-r-coco bg-cocoa-cream p-6 shadow-drawer">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-2xl font-extrabold">Menu</p>
          <button
            aria-label="Close menu"
            className="grid h-10 w-10 place-items-center rounded-full border border-cocoa-line bg-white"
            onClick={() => dispatch({ type: "drawer/close" })}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <nav className="grid gap-1 rounded-coco border border-cocoa-line bg-white px-4">
          {primaryNavigation.map((item) => (
            <div className="border-b border-cocoa-line py-4 last:border-b-0" key={item.label}>
              <Link
                className="block text-base font-extrabold text-cocoa-ink"
                href={item.href}
                onClick={() => dispatch({ type: "drawer/close" })}
              >
                {item.label}
              </Link>
              {item.children?.length ? (
                <div className="mt-2 grid gap-2 pl-3">
                  {item.children.map((child) => (
                    <Link
                      className="block text-sm font-bold text-cocoa-text"
                      href={child.href}
                      key={child.label}
                      onClick={() => dispatch({ type: "drawer/close" })}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
