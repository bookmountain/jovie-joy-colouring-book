"use client";

import Link from "next/link";

export type AdminUser = { email: string; role: string };

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
    { href: "/admin/pages/header", label: "Header", icon: "🧭" },
    { href: "/admin/pages/footer", label: "Footer", icon: "🦶" },
    { href: "/admin/pages/announcement", label: "Announcement", icon: "📣" },
    { href: "/admin/static-pages", label: "Static pages", icon: "📄" },
  ]},
  { group: "Editorial", items: [
    { href: "/admin/blog", label: "Blog", icon: "📝", soon: true, badge: "soon" },
    { href: "/admin/comics", label: "Comics", icon: "🎨", soon: true, badge: "soon" },
    { href: "/admin/gallery", label: "Gallery", icon: "🖼️", soon: true, badge: "soon" },
    { href: "/admin/faq", label: "FAQ", icon: "❓", soon: true, badge: "soon" },
    { href: "/admin/featured-on", label: "Featured On", icon: "⭐", soon: true, badge: "soon" },
  ]},
];

function isActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/admin") return pathname === "/admin";
  return pathname === itemHref || pathname.startsWith(itemHref + "/");
}

export function AdminSidebar({
  pathname, user, onSignOut,
}: { pathname: string; user: AdminUser | null; onSignOut: () => void }) {
  return (
    <aside className="admin-side">
      <div className="brand">
        <div className="logo">Z</div>
        <div>
          <div className="name">Zoe&amp;Book</div>
          <div className="sub">Admin</div>
        </div>
      </div>

      {NAV.map((group) => (
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
