"use client";

import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";

export type CartItem = {
  productSlug: string;
  title: string;
  priceCents: number;
  quantity: number;
  image?: string;
  option?: string;
};

export type DrawerName = "cart" | "search" | "mobile-menu" | null;

export type ModalName =
  | "login"
  | "choose-options"
  | "edit-option"
  | "back-in-stock"
  | "terms"
  | null;

export type SiteState = {
  cart: {
    items: CartItem[];
  };
  wishlist: string[];
  recentlyViewed: string[];
  activeDrawer: DrawerName;
  activeModal: ModalName;
  searchQuery: string;
  newsletterEmails: string[];
};

export type SiteAction =
  | { type: "state/hydrate"; state: SiteState }
  | { type: "cart/add"; item: CartItem }
  | { type: "cart/remove"; productSlug: string }
  | { type: "cart/updateQuantity"; productSlug: string; quantity: number }
  | { type: "cart/clear" }
  | { type: "wishlist/toggle"; productSlug: string }
  | { type: "wishlist/remove"; productSlug: string }
  | { type: "recentlyViewed/add"; productSlug: string }
  | { type: "drawer/open"; drawer: Exclude<DrawerName, null> }
  | { type: "drawer/close" }
  | { type: "modal/open"; modal: Exclude<ModalName, null> }
  | { type: "modal/close" }
  | { type: "search/set"; query: string }
  | { type: "newsletter/add"; email: string };

export const initialSiteState: SiteState = {
  cart: {
    items: [],
  },
  wishlist: [],
  recentlyViewed: [],
  activeDrawer: null,
  activeModal: null,
  searchQuery: "",
  newsletterEmails: [],
};

export function siteReducer(
  state: SiteState,
  action: SiteAction,
): SiteState {
  switch (action.type) {
    case "state/hydrate":
      return action.state;
    case "cart/add": {
      const existing = state.cart.items.find(
        (item) =>
          item.productSlug === action.item.productSlug &&
          item.option === action.item.option,
      );

      if (!existing) {
        return {
          ...state,
          cart: {
            items: [
              ...state.cart.items,
              { ...action.item, quantity: Math.max(1, action.item.quantity) },
            ],
          },
          activeDrawer: "cart",
        };
      }

      return {
        ...state,
        cart: {
          items: state.cart.items.map((item) =>
            item === existing
              ? {
                  ...item,
                  quantity: item.quantity + Math.max(1, action.item.quantity),
                }
              : item,
          ),
        },
        activeDrawer: "cart",
      };
    }
    case "cart/remove":
      return {
        ...state,
        cart: {
          items: state.cart.items.filter(
            (item) => item.productSlug !== action.productSlug,
          ),
        },
      };
    case "cart/updateQuantity":
      return {
        ...state,
        cart: {
          items: state.cart.items
            .map((item) =>
              item.productSlug === action.productSlug
                ? { ...item, quantity: Math.max(0, action.quantity) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        },
      };
    case "cart/clear":
      return { ...state, cart: { items: [] } };
    case "wishlist/toggle":
      return state.wishlist.includes(action.productSlug)
        ? {
            ...state,
            wishlist: state.wishlist.filter(
              (productSlug) => productSlug !== action.productSlug,
            ),
          }
        : { ...state, wishlist: [...state.wishlist, action.productSlug] };
    case "wishlist/remove":
      return {
        ...state,
        wishlist: state.wishlist.filter(
          (productSlug) => productSlug !== action.productSlug,
        ),
      };
    case "recentlyViewed/add":
      return {
        ...state,
        recentlyViewed: [
          action.productSlug,
          ...state.recentlyViewed.filter(
            (productSlug) => productSlug !== action.productSlug,
          ),
        ].slice(0, 8),
      };
    case "drawer/open":
      return { ...state, activeDrawer: action.drawer };
    case "drawer/close":
      return { ...state, activeDrawer: null };
    case "modal/open":
      return { ...state, activeModal: action.modal };
    case "modal/close":
      return { ...state, activeModal: null };
    case "search/set":
      return { ...state, searchQuery: action.query };
    case "newsletter/add":
      return {
        ...state,
        newsletterEmails: [
          ...state.newsletterEmails,
          action.email.trim().toLowerCase(),
        ],
      };
    default:
      return state;
  }
}

type SiteContextValue = {
  state: SiteState;
  dispatch: Dispatch<SiteAction>;
  cartCount: number;
  cartSubtotal: number;
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(siteReducer, initialSiteState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem("coco-wyo-learning-store");

    if (raw) {
      try {
        dispatch({
          type: "state/hydrate",
          state: { ...initialSiteState, ...JSON.parse(raw) },
        });
      } catch {
        window.localStorage.removeItem("coco-wyo-learning-store");
      }
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(
      "coco-wyo-learning-store",
      JSON.stringify({
        ...state,
        activeDrawer: null,
        activeModal: null,
        searchQuery: "",
      }),
    );
  }, [hydrated, state]);

  const value = useMemo<SiteContextValue>(() => {
    const cartCount = state.cart.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    const cartSubtotal = state.cart.items.reduce(
      (total, item) => total + item.priceCents * item.quantity,
      0,
    );

    return { state, dispatch, cartCount, cartSubtotal };
  }, [state]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteContextValue {
  const value = useContext(SiteContext);

  if (!value) {
    throw new Error("useSite must be used inside SiteProvider");
  }

  return value;
}
