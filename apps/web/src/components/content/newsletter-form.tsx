"use client";

import { useState } from "react";
import { subscribeEmail, type NewsletterStatus } from "@/lib/newsletter";
import { useSite } from "@/state/site-store";

export function NewsletterForm() {
  const { state, dispatch } = useSite();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<NewsletterStatus | null>(null);

  return (
    <section className="bg-white py-10 lg:py-12">
      <form
        className="mx-auto grid max-w-4xl gap-4 px-4 text-center lg:px-8"
        onSubmit={(event) => {
          event.preventDefault();
          const result = subscribeEmail(state.newsletterEmails, email);
          setStatus(result.status);

          if (result.status === "subscribed") {
            dispatch({ type: "newsletter/add", email });
            setName("");
            setEmail("");
          }
        }}
      >
        <h2 className="coco-heading">
          Subscribe for Updates
        </h2>
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
            className="inline-flex min-h-12 items-center justify-center rounded-[15px] bg-cocoa-ink px-7 text-sm font-bold text-white transition hover:bg-[#2f1010] focus:outline-none focus:ring-2 focus:ring-cocoa-honey focus:ring-offset-2"
            type="submit"
          >
            Subscribe
          </button>
        </div>
        {status === "subscribed" ? (
          <p className="text-sm font-extrabold text-cocoa-ink">
            Thanks for subscribing!
          </p>
        ) : null}
        {status === "duplicate" ? (
          <p className="text-sm font-extrabold text-cocoa-ink">
            This email has been registered!
          </p>
        ) : null}
        {status === "invalid" ? (
          <p className="text-sm font-extrabold text-cocoa-ink">
            Please enter a valid email address.
          </p>
        ) : null}
      </form>
    </section>
  );
}
