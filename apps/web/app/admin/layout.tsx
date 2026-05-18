'use client';

import './admin.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

interface AdminUser { email: string; name?: string; isAdmin: boolean }

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: '/admin', label: 'Analytics', exact: true },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/content', label: 'Content' },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Analytics',
  '/admin/products': 'Products',
  '/admin/orders': 'Orders',
  '/admin/content': 'Site content',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (pathname === '/admin/login') { setReady(true); return; }
    const token = localStorage.getItem('jovie_token');
    if (!token) { router.replace('/admin/login'); return; }

    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((u: AdminUser | null) => {
        if (!u?.isAdmin) { router.replace('/admin/login'); return; }
        setUser(u);
        setReady(true);
      })
      .catch(() => router.replace('/admin/login'));
  }, [pathname, router]);

  if (!ready) return null;
  if (pathname === '/admin/login') return <div className="admin-root">{children}</div>;

  function signOut() {
    localStorage.removeItem('jovie_token');
    router.push('/admin/login');
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname?.startsWith(href);

  const pageTitle = PAGE_TITLES[pathname ?? ''] ?? 'Admin';

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-brand-title">Jovie Joy</div>
          <div className="admin-sidebar-brand-sub">Admin</div>
        </div>
        <nav className="admin-sidebar-nav">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`admin-nav-item ${isActive(n.href, n.exact) ? 'active' : ''}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <Link href="/" className="admin-nav-item" style={{ color: 'var(--a-muted)' }}>
            View site
          </Link>
          <button
            onClick={signOut}
            className="admin-nav-item"
            style={{ color: 'var(--a-muted)', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <div className="admin-topbar">
          <div className="admin-topbar-title">{pageTitle}</div>
          <div className="admin-topbar-user">{user?.email}</div>
        </div>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
