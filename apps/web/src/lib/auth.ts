"use client";

import { API_URL, apiMe, type UserDto } from "@/lib/api";

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
  } catch {
    tokenStorage.clear();
    return null;
  }
}

export function signOut(redirectTo: string = "/") {
  tokenStorage.clear();
  if (typeof window !== "undefined") window.location.assign(redirectTo);
}
