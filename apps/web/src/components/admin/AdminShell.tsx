"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/state/admin-auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/orders", label: "Orders" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { user, signOut } = useAdminAuth();

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-cocoa-cream">
      <aside className="hidden w-60 shrink-0 border-r border-cocoa-line bg-white px-5 py-6 lg:block">
        <Link className="mb-8 block text-xl font-extrabold text-cocoa-ink" href="/admin">
          Zoe&amp;Book Admin
        </Link>
        <nav className="space-y-1">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href));
            return (
              <Link
                className={`block rounded-coco-sm px-3 py-2 text-sm ${
                  active ? "bg-cocoa-honey font-bold text-cocoa-ink" : "text-cocoa-text hover:bg-cocoa-cream"
                }`}
                href={n.href}
                key={n.href}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-cocoa-line bg-white px-6 py-3">
          <div className="text-lg font-bold lg:hidden">Zoe&amp;Book Admin</div>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="text-cocoa-text">{user?.email}</span>
            <button className="text-cocoa-coral underline" onClick={signOut} type="button">
              Sign out
            </button>
          </div>
        </header>
        <main className="p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
