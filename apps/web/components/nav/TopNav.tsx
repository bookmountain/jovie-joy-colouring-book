'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../CartProvider';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/freebie', label: 'Free Pack' },
  { href: '/about', label: 'About' },
];

export function TopNav() {
  const pathname = usePathname();
  const { itemCount, setCartOpen } = useCart();

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname?.startsWith(href);

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
        <Link href="/shop" className="btn sm ghost">Search</Link>
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
