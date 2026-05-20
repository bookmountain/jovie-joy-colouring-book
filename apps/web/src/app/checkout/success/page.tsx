"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSite } from "@/state/site-store";

export default function CheckoutSuccess() {
  const { dispatch } = useSite();
  useEffect(() => {
    dispatch({ type: "cart/clear" });
  }, [dispatch]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="coco-heading mb-3">Thank you!</h1>
      <p className="mb-6 text-cocoa-text">
        Your order is being processed. You&apos;ll receive an email with your
        download links shortly.
      </p>
      <Link className="coco-button-primary" href="/collections">
        Keep browsing
      </Link>
    </main>
  );
}
