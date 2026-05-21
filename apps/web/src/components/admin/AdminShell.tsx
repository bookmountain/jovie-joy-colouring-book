"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/state/admin-auth";
import { AdminSidebar, type AdminUser } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

type AdminShellInternalProps = {
  children: React.ReactNode;
  /** Inject for testing; production passes nothing and uses hooks. */
  pathname?: string;
  user?: AdminUser | null;
  onSignOut?: () => void;
};

/** Inner shell — always used when inside AdminAuthProvider (production). */
function AdminShellConnected({
  children,
  pathname: pathnameProp,
  user: userProp,
  onSignOut: onSignOutProp,
}: AdminShellInternalProps) {
  const hookPathname = usePathname() ?? "";
  const { user: hookUser, signOut: hookSignOut } = useAdminAuth();
  const pathname = pathnameProp ?? hookPathname;
  const user = userProp !== undefined ? userProp : (hookUser ? { email: hookUser.email, role: "Owner" } : null);
  const onSignOut = onSignOutProp ?? hookSignOut;

  useEffect(() => {
    document.body.classList.add("admin-route");
    return () => { document.body.classList.remove("admin-route"); };
  }, [pathname]);

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="admin-app">
      <AdminSidebar pathname={pathname} user={user} onSignOut={onSignOut} />
      <main className="admin-main">
        <AdminTopbar />
        <div className="admin-body">{children}</div>
      </main>
    </div>
  );
}

/** Standalone shell for tests — no provider needed when all props are injected. */
function AdminShellStandalone({
  children,
  pathname,
  user,
  onSignOut,
}: Required<AdminShellInternalProps>) {
  useEffect(() => {
    document.body.classList.add("admin-route");
    return () => { document.body.classList.remove("admin-route"); };
  }, [pathname]);

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="admin-app">
      <AdminSidebar pathname={pathname} user={user} onSignOut={onSignOut} />
      <main className="admin-main">
        <AdminTopbar />
        <div className="admin-body">{children}</div>
      </main>
    </div>
  );
}

export function AdminShell({ children, pathname, user, onSignOut }: AdminShellInternalProps) {
  // When all injectable props are provided (test mode), use the standalone variant
  // that doesn't call useAdminAuth (which requires AdminAuthProvider).
  if (pathname !== undefined && user !== undefined && onSignOut !== undefined) {
    return (
      <AdminShellStandalone pathname={pathname} user={user} onSignOut={onSignOut}>
        {children}
      </AdminShellStandalone>
    );
  }

  return (
    <AdminShellConnected pathname={pathname} user={user} onSignOut={onSignOut}>
      {children}
    </AdminShellConnected>
  );
}
