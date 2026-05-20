"use client";

import { useState } from "react";
import { apiNewsletterSignup } from "@/lib/api";
import { useBundle } from "@/state/catalog-provider";

type Status = "idle" | "submitting" | "ok" | "invalid" | "error";

export function NewsletterForm() {
  const bundle = useBundle();
  const copy = bundle.newsletterCopy[0]?.data ?? {
    heading: "Subscribe for Updates",
    ctaLabel: "Subscribe",
    successMessage: "Thanks for subscribing!",
  };
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      setStatus("invalid");
      return;
    }
    setStatus("submitting");
    try {
      await apiNewsletterSignup(email);
      setStatus("ok");
      setName("");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="bg-white py-10 lg:py-12">
      <form
        className="mx-auto grid max-w-4xl gap-4 px-4 text-center lg:px-8"
        onSubmit={handleSubmit}
      >
        <h2 className="coco-heading">{copy.heading}</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            aria-label="Name"
            className="min-h-12 rounded-[15px] border border-[#acacac] bg-transparent px-5 text-sm text-cocoa-ink outline-none transition placeholder:text-[#2f1010] focus:border-cocoa-purple focus:ring-2 focus:ring-cocoa-lavender"
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            value={name}
          />
          <input
            aria-label="Your email"
            className="min-h-12 rounded-[15px] border border-[#acacac] bg-transparent px-5 text-sm text-cocoa-ink outline-none transition placeholder:text-[#2f1010] focus:border-cocoa-purple focus:ring-2 focus:ring-cocoa-lavender"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Your email"
            type="email"
            value={email}
          />
          <button
            className="inline-flex min-h-12 items-center justify-center rounded-[15px] bg-cocoa-ink px-7 text-sm font-bold text-white transition hover:bg-[#2f1010] focus:outline-none focus:ring-2 focus:ring-cocoa-honey focus:ring-offset-2 disabled:opacity-60"
            disabled={status === "submitting"}
            type="submit"
          >
            {status === "submitting" ? "Sending…" : copy.ctaLabel}
          </button>
        </div>
        {status === "ok" ? (
          <p className="text-sm font-extrabold text-cocoa-ink">
            {copy.successMessage}
          </p>
        ) : null}
        {status === "invalid" ? (
          <p className="text-sm font-extrabold text-cocoa-ink">
            Please enter a valid email address.
          </p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm font-extrabold text-cocoa-coral">
            Could not subscribe. Try again.
          </p>
        ) : null}
      </form>
    </section>
  );
}
