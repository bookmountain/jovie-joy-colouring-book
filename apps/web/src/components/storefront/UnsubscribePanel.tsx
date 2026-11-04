"use client";

import { useState } from "react";
import { apiNewsletterUnsubscribe } from "@/lib/api";

type State = "ready" | "working" | "done" | "error";

// Needs a click on purpose: mail scanners open every link in an email, so loading
// this page must never unsubscribe anyone.
export function UnsubscribePanel({ token }: { token: string }) {
  const [state, setState] = useState<State>(token ? "ready" : "error");

  async function unsubscribe() {
    setState("working");
    try {
      await apiNewsletterUnsubscribe(token);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-soft">
      {state === "done" ? (
        <>
          <h1 className="mb-2 text-2xl font-bold text-cocoa-ink">You&apos;re unsubscribed</h1>
          <p className="text-cocoa-text">You won&apos;t get any more news from us. Thanks for colouring with us.</p>
        </>
      ) : state === "error" ? (
        <>
          <h1 className="mb-2 text-2xl font-bold text-cocoa-ink">This link isn&apos;t working</h1>
          <p className="text-cocoa-text">Please use the unsubscribe link in your latest email from us.</p>
        </>
      ) : (
        <>
          <h1 className="mb-2 text-2xl font-bold text-cocoa-ink">Unsubscribe?</h1>
          <p className="mb-6 text-cocoa-text">You&apos;ll stop getting emails about new products and freebies.</p>
          <button
            type="button"
            onClick={unsubscribe}
            disabled={state === "working"}
            className="rounded-full bg-cocoa-coral px-7 py-3 font-bold text-white disabled:opacity-60"
          >
            {state === "working" ? "Working…" : "Yes, unsubscribe me"}
          </button>
        </>
      )}
    </div>
  );
}
