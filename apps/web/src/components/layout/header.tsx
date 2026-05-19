"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { apiGetContent, type NavLink } from "@/lib/api";
import { useSite } from "@/state/site-store";
import { MegaMenu } from "./mega-menu";
import { MobileMenu } from "./mobile-menu";

export function Header() {
  const { cartCount, state, dispatch } = useSite();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [primaryNavigation, setPrimaryNavigation] = useState<NavLink[]>([]);
  const closeMenuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiGetContent().then((b) => setPrimaryNavigation(b.navigation)).catch(() => setPrimaryNavigation([]));
  }, []);

  const clearMenuCloseTimer = () => {
    if (closeMenuTimer.current) {
      clearTimeout(closeMenuTimer.current);
      closeMenuTimer.current = null;
    }
  };

  const openMenu = (label: string) => {
    clearMenuCloseTimer();
    setActiveMenu(label);
  };

  const closeMenu = ({ immediate = false } = {}) => {
    clearMenuCloseTimer();

    if (immediate) {
      setActiveMenu(null);
      return;
    }

    closeMenuTimer.current = setTimeout(() => {
      setActiveMenu(null);
      closeMenuTimer.current = null;
    }, 260);
  };

  useEffect(() => clearMenuCloseTimer, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-cocoa-line bg-white">
        <div className="hidden lg:block">
          <div className="mx-auto grid max-w-[1570px] grid-cols-[minmax(260px,380px)_1fr_minmax(260px,380px)] items-center gap-6 px-4 py-[18px]">
            <button
              aria-label="Search"
              className="flex h-[50px] max-w-[365px] items-center justify-between rounded-full bg-[#fafafa] px-5 text-left text-base font-medium text-[#acacac] transition hover:bg-cocoa-cream"
              onClick={() => dispatch({ type: "drawer/open", drawer: "search" })}
              type="button"
            >
              <span>Search the store</span>
              <Search aria-hidden="true" className="h-5 w-5 text-[#727272]" />
            </button>
            <Link
              aria-label="Zoe&Book"
              className="justify-self-center font-display text-[31px] font-extrabold leading-none tracking-normal text-cocoa-ink"
              href="/"
            >
              Zoe&amp;Book
            </Link>
            <div className="flex items-center justify-end gap-5 text-cocoa-ink">
              <button
                aria-label="Sign in"
                className="grid h-11 w-11 place-items-center rounded-full transition hover:bg-cocoa-cream"
                onClick={() => dispatch({ type: "modal/open", modal: "login" })}
                type="button"
              >
                <UserRound aria-hidden="true" className="h-[22px] w-[22px]" />
              </button>
              <Link
                aria-label={`My wish list (${state.wishlist.length})`}
                className="relative grid h-11 w-11 place-items-center rounded-full transition hover:bg-cocoa-cream"
                href="/pages/wishlist"
              >
                <Heart aria-hidden="true" className="h-[23px] w-[23px]" />
                {state.wishlist.length > 0 ? (
                  <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-cocoa-line px-1 text-xs font-bold text-cocoa-ink">
                    {state.wishlist.length}
                  </span>
                ) : null}
              </Link>
              <button
                aria-label="Shopping cart"
                className="relative grid h-11 w-11 place-items-center rounded-full transition hover:bg-cocoa-cream"
                onClick={() => dispatch({ type: "drawer/open", drawer: "cart" })}
                type="button"
              >
                <ShoppingBag aria-hidden="true" className="h-[22px] w-[22px]" />
                {cartCount > 0 ? (
                  <span className="absolute -right-1 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-cocoa-honey px-1 text-xs font-bold text-cocoa-ink">
                    {cartCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
          <nav className="mx-auto flex max-w-[1170px] items-center justify-center gap-[30px] px-4 py-[11px]">
            {primaryNavigation.map((item) => (
              <MegaMenu
                active={activeMenu === item.label}
                item={item}
                key={item.label}
                onClose={closeMenu}
                onOpen={() => openMenu(item.label)}
              />
            ))}
          </nav>
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:hidden">
          <button
            aria-label="Open menu"
            className="grid h-11 w-11 place-items-center rounded-full border border-cocoa-line bg-cocoa-cream"
            onClick={() => dispatch({ type: "drawer/open", drawer: "mobile-menu" })}
            type="button"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <Link
            aria-label="Zoe&Book"
            className="flex min-w-28 items-center justify-center font-display text-[27px] font-extrabold leading-none tracking-normal text-cocoa-ink"
            href="/"
          >
            Zoe&amp;Book
          </Link>
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <button
              aria-label="Search"
              className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-cocoa-cream"
              onClick={() => dispatch({ type: "drawer/open", drawer: "search" })}
              type="button"
            >
              <Search aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              aria-label="Sign in"
              className="hidden h-10 w-10 place-items-center rounded-full transition hover:bg-cocoa-cream sm:grid"
              onClick={() => dispatch({ type: "modal/open", modal: "login" })}
              type="button"
            >
              <UserRound aria-hidden="true" className="h-5 w-5" />
            </button>
            <Link
              aria-label={`My wish list (${state.wishlist.length})`}
              className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-cocoa-cream"
              href="/pages/wishlist"
            >
              <Heart aria-hidden="true" className="h-5 w-5" />
            </Link>
            <button
              aria-label="Shopping cart"
              className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-cocoa-cream"
              onClick={() => dispatch({ type: "drawer/open", drawer: "cart" })}
              type="button"
            >
              <ShoppingBag aria-hidden="true" className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-cocoa-honey px-1 text-xs font-bold text-cocoa-ink">
                  {cartCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>
      <MobileMenu />
    </>
  );
}
