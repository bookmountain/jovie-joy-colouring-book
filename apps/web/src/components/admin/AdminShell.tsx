"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/state/admin-auth";

const NAV: Array<{ group: string; items: { href: string; label: string }[] }> = [
  { group: "Overview", items: [{ href: "/admin", label: "Dashboard" }] },
  { group: "Pages", items: [
    { href: "/admin/pages/home", label: "Home" },
    { href: "/admin/pages/footer", label: "Footer" },
    { href: "/admin/pages/header", label: "Header" },
    { href: "/admin/pages/announcement", label: "Announcement" },
    { href: "/admin/pages/newsletter", label: "Newsletter copy" },
    { href: "/admin/static-pages", label: "Static pages" },
  ]},
  { group: "Catalog", items: [
    { href: "/admin/products", label: "Products" },
    { href: "/admin/collections", label: "Collections" },
  ]},
  { group: "Content (raw)", items: [
    { href: "/admin/content", label: "Content blocks" },
  ]},
  { group: "Operations", items: [
    { href: "/admin/orders", label: "Orders" },
  ]},
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
        <nav className="space-y-4">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="mb-1 px-3 text-xs font-bold uppercase tracking-wide text-cocoa-text/70">{g.group}</div>
              {g.items.map((n) => {
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
            </div>
          ))}
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
