"use client";

import { API_URL, ApiError, apiMe, type UserDto } from "@/lib/api";

const TOKEN_KEY = "zoe-book-token";

export const tokenStorage = {
  read(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  write(token: string) {
    if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
  },
};

export function googleSignInUrl(returnPath: string = "/"): string {
  const safe = encodeURIComponent(returnPath);
  return `${API_URL}/auth/google?return=${safe}`;
}

export async function fetchCurrentUser(): Promise<UserDto | null> {
  const token = tokenStorage.read();
  if (!token) return null;
  try {
    return await apiMe(token);
  } catch (e) {
    // Only drop the session when the server says the token is actually invalid.
    // Transient failures (network, 5xx) must NOT log the user out — otherwise a
    // hiccup on /auth/me while the storefront header mounts signs an admin out.
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      tokenStorage.clear();
    }
    return null;
  }
}

export function signOut(redirectTo: string = "/") {
  tokenStorage.clear();
  if (typeof window !== "undefined") window.location.assign(redirectTo);
}

export async function adminLoginWithPassword(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Login failed (${res.status})`);
  }
  const json = (await res.json()) as { token: string; user: { isAdmin: boolean } };
  if (!json.user.isAdmin) throw new Error("Not an admin account");
  tokenStorage.write(json.token);
  return json.token;
}
