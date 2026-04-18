'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '../CartProvider';
import { useEffect, useState } from 'react';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/freebie', label: 'Free Pack' },
  { href: '/about', label: 'About' },
];

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

interface UserInfo { id: string; email: string; name?: string; avatarUrl?: string }

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount, setCartOpen } = useCart();
  const [user, setUser] = useState<UserInfo | null>(null);

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname?.startsWith(href);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jovie_token') : null;
    if (!token) return;
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setUser(data))
      .catch(() => {});
  }, []);

  function signOut() {
    localStorage.removeItem('jovie_token');
    setUser(null);
    router.push('/');
  }

  return (
    <div className="topnav">
      <Link href="/" className="logo" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
        jovie joy<span className="logo-dot" />
      </Link>
      <div className="nav-links">
        {LINKS.map(l => (
          <Link key={l.href} href={l.href} className={isActive(l.href) ? 'active' : ''}>{l.label}</Link>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {user ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={user.name ?? user.email} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--ink)' }} />
              : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--mint)', border: '2px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sniglet', fontSize: 13 }}>{(user.name ?? user.email)[0].toUpperCase()}</div>}
            <button className="btn sm ghost" onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <Link href="/login" className="btn sm ghost">Sign in</Link>
        )}
        <button className="btn sm primary" onClick={() => setCartOpen(true)} style={{ position: 'relative' }}>
          Cart
          {itemCount > 0 && (
            <span style={{
              background: 'var(--ink)', color: 'var(--sun)',
              borderRadius: 999, padding: '2px 7px', fontSize: 12, marginLeft: 4, minWidth: 22,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{itemCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}
