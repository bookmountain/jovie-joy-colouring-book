"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCurrentUser, signOut as authSignOut } from "@/lib/auth";
import type { UserDto } from "@/lib/api";

type AdminAuthValue = {
  user: UserDto | null;
  status: "loading" | "ready";
  signOut: () => void;
};

const Ctx = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      setUser(u);
      setStatus("ready");
    });
  }, []);

  return (
    <Ctx.Provider value={{ user, status, signOut: () => authSignOut("/admin/login") }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminAuth must be inside AdminAuthProvider");
  return v;
}
