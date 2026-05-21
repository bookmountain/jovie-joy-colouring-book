"use client";

import { useState } from "react";
import { adminLoginWithPassword } from "@/lib/auth";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPanel,
  AdminPageHeader,
} from "@/components/admin/ui";

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
      <AdminPanel className="w-full max-w-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <AdminPageHeader title="Admin sign in" />
          <AdminField>
            <AdminLabel htmlFor="login-email">Email</AdminLabel>
            <AdminInput
              id="login-email"
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
          </AdminField>
          <AdminField>
            <AdminLabel htmlFor="login-password">Password</AdminLabel>
            <AdminInput
              id="login-password"
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              value={password}
            />
          </AdminField>
          {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}
          <AdminButton className="w-full disabled:opacity-60" disabled={submitting} type="submit" variant="primary">
            {submitting ? "Signing in…" : "Sign in"}
          </AdminButton>
        </form>
      </AdminPanel>
    </main>
  );
}
