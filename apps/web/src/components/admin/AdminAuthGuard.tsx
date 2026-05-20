"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuth } from "@/state/admin-auth";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, status } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "/admin";

  useEffect(() => {
    if (status === "ready" && (!user || !user.isAdmin) && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
  }, [user, status, pathname, router]);

  if (status === "loading") return <div className="p-8">Loading…</div>;
  if (pathname === "/admin/login") return <>{children}</>;
  if (!user || !user.isAdmin) return null;
  return <>{children}</>;
}
