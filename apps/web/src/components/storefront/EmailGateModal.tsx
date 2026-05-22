"use client";

import { useEffect, useRef, useState } from "react";
import { requestFreebie, type FreebieListItem } from "@/lib/freebies";

type State =
  | { kind: "form" }
  | { kind: "loading" }
  | { kind: "success"; email: string }
  | { kind: "error"; message: string };

export function EmailGateModal({ item, onClose }: { item: FreebieListItem; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [state, setState] = useState<State>({ kind: "form" });
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    setState({ kind: "loading" });
    try {
      await requestFreebie(item.slug, email, optIn);
      setState({ kind: "success", email });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Something went wrong" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div ref={dialogRef} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-cocoa-ink">{item.title}</h2>
        <p className="mb-4 text-sm text-cocoa-text">{item.excerpt}</p>

        {state.kind === "form" || state.kind === "loading" || state.kind === "error" ? (
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="space-y-3"
          >
            <label className="block text-sm font-semibold text-cocoa-ink">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-cocoa-line px-3 py-2 text-sm"
                aria-label="Email"
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-cocoa-text">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
                aria-label="Send me future colouring freebies and updates"
              />
              <span>Send me future colouring freebies and updates.</span>
            </label>
            <p className="text-xs text-cocoa-muted">We only use your email to send the download link.</p>
            {state.kind === "error" ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm">Cancel</button>
              <button
                type="submit"
                disabled={state.kind === "loading"}
                className="rounded-lg bg-cocoa-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {state.kind === "loading" ? "Sending…" : "Send me the link"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-cocoa-text">
              Check your inbox at <span className="font-semibold">{state.email}</span> — the download link is on its way.
            </p>
            <p className="text-xs text-cocoa-muted">
              Didn&apos;t arrive in 5 minutes? Check spam, or{" "}
              <button type="button" onClick={submit} className="underline">resend</button>.
            </p>
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="rounded-lg bg-cocoa-purple px-4 py-2 text-sm font-semibold text-white">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
