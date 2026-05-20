"use client";

import { useState } from "react";
import { adminLoginWithPassword } from "@/lib/auth";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminLoginWithPassword(email.trim(), password);
      window.location.assign("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cocoa-cream">
      <form className="coco-panel w-full max-w-sm p-8" onSubmit={handleSubmit}>
        <h1 className="coco-heading mb-6">Admin sign in</h1>
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-semibold">Email</span>
          <input
            className="coco-input w-full"
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-semibold">Password</span>
          <input
            className="coco-input w-full"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="mb-3 text-sm text-cocoa-coral">{error}</p> : null}
        <button className="coco-button-primary w-full disabled:opacity-60" disabled={submitting} type="submit">
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
