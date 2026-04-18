'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Receipt,
  FileText,
  LogOut,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

const NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: '/admin', label: 'Analytics', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: Receipt },
  { href: '/admin/content', label: 'Content', icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') { setReady(true); return; }
    const token = localStorage.getItem('jovie_token');
    if (!token) { router.replace('/admin/login'); return; }

    // Verify token is still valid and user is admin
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(user => {
        if (!user?.isAdmin) { router.replace('/admin/login'); return; }
        setReady(true);
      })
      .catch(() => router.replace('/admin/login'));
  }, [pathname, router]);

  if (!ready) return null;
  if (pathname === '/admin/login') return <>{children}</>;

  function signOut() {
    localStorage.removeItem('jovie_token');
    router.push('/admin/login');
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname?.startsWith(href);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f4f0' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: 'var(--ink)', color: 'var(--cream)',
        display: 'flex', flexDirection: 'column', padding: '28px 0',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      }}>
        <div style={{ padding: '0 24px 28px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="logo" style={{ color: 'var(--sun)', fontSize: 18 }}>jovie joy</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2, fontFamily: 'Sniglet' }}>admin dashboard</div>
        </div>
        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(n => {
            const Icon = n.icon;
            const active = isActive(n.href, n.exact);
            return (
              <Link key={n.href} href={n.href} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                textDecoration: 'none', fontSize: 14, fontFamily: 'Sniglet',
                background: active ? 'var(--sun)' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--cream)',
                fontWeight: active ? 800 : 400,
              }}>
                <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: '20px 12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', fontSize: 13,
            color: 'rgba(255,255,255,0.55)', textDecoration: 'none',
          }}>
            <ArrowLeft size={15} strokeWidth={2} />
            <span>View site</span>
          </Link>
          <button onClick={signOut} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '8px 12px', textAlign: 'left',
            fontSize: 13, fontFamily: 'inherit',
            color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer',
          }}>
            <LogOut size={15} strokeWidth={2} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 220, flex: 1, padding: 32, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
