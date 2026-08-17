"use client";

import Link from "next/link";
import { shopIsEnabled } from "@/lib/site-modules";
import { useAdminModules } from "@/state/admin-modules";

export type AdminUser = { email: string; role: string };

// Hidden while the shop module is off: these sections manage the catalogue
// and commerce flows that the storefront no longer exposes. The pages stay
// deployed, so re-enabling the module brings them straight back.
const SHOP_ADMIN_HREFS = new Set([
  "/admin/products",
  "/admin/collections",
  "/admin/orders",
  "/admin/customers",
  "/admin/notify-me",
]);

const NAV: Array<{
  group: string;
  items: Array<{ href: string; label: string; icon: string; soon?: boolean; badge?: string }>;
}> = [
  { group: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: "📊" }] },
  { group: "Catalog", items: [
    { href: "/admin/products", label: "Products", icon: "📦" },
    { href: "/admin/collections", label: "Collections", icon: "🗂️" },
  ]},
  { group: "Commerce", items: [
    { href: "/admin/orders", label: "Orders", icon: "🧾" },
    { href: "/admin/customers", label: "Customers", icon: "👥" },
    { href: "/admin/notify-me", label: "Notify me", icon: "🔔" },
    { href: "/admin/subscribers", label: "Subscribers", icon: "✉️" },
  ]},
  { group: "Site content", items: [
    { href: "/admin/pages/home", label: "Home page", icon: "🏠" },
    { href: "/admin/about", label: "About page", icon: "💁" },
    { href: "/admin/freebies", label: "Freebies page", icon: "🎁" },
    { href: "/admin/pages/header", label: "Header", icon: "🧭" },
    { href: "/admin/navigation", label: "Navigation", icon: "🧭" },
    { href: "/admin/pages/footer", label: "Footer", icon: "🦶" },
    { href: "/admin/pages/announcement", label: "Announcement", icon: "📣" },
    { href: "/admin/pages/newsletter", label: "Newsletter", icon: "💌" },
    { href: "/admin/static-pages", label: "Static pages", icon: "📄" },
    { href: "/admin/content", label: "Advanced content", icon: "🧩" },
  ]},
  { group: "Editorial", items: [
    { href: "/admin/blog", label: "Blog", icon: "📝" },
    { href: "/admin/comics", label: "Comics", icon: "🎨" },
    { href: "/admin/gallery", label: "Gallery", icon: "🖼️" },
    { href: "/admin/faq", label: "FAQ", icon: "❓" },
    { href: "/admin/featured-on", label: "Featured On", icon: "⭐" },
  ]},
];

function isActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/admin") return pathname === "/admin";
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

export function AdminSidebar({
  pathname, user, onSignOut,
}: { pathname: string; user: AdminUser | null; onSignOut: () => void }) {
  const { modules } = useAdminModules();
  const shop = shopIsEnabled(modules);
  const nav = NAV
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => shop || !SHOP_ADMIN_HREFS.has(item.href)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className="admin-side">
      <div className="brand">
        <div className="logo">Z</div>
        <div>
          <div className="name">Zoe&amp;Book</div>
          <div className="sub">Admin</div>
        </div>
      </div>

      {nav.map((group) => (
        <div key={group.group}>
          <div className="admin-navgroup-label">{group.group}</div>
          {group.items.map((item) => {
            const active = isActive(item.href, pathname) && !item.soon;
            if (item.soon) {
              return (
                <div
                  key={item.href}
                  className="admin-navitem"
                  data-soon="true"
                  aria-disabled
                >
                  <span className="ic">{item.icon}</span>
                  <span className="label">{item.label}</span>
                  {item.badge ? <span className="badge">{item.badge}</span> : null}
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className="admin-navitem"
                data-active={active ? "true" : undefined}
              >
                <span className="ic">{item.icon}</span>
                <span className="label">{item.label}</span>
                {item.badge ? <span className="badge">{item.badge}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}

      {user ? (
        <div className="user">
          <div className="av">{user.email.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }} className="info">
            <div className="em">{user.email}</div>
            <div className="role">{user.role}</div>
          </div>
          <button type="button" className="signout" onClick={onSignOut}>Sign out</button>
        </div>
      ) : null}
    </aside>
  );
}
