'use client';

import Link from 'next/link';
import { useCart } from '../CartProvider';
import { ProductCover } from '../shared/ProductCover';
import { Star } from '../shared/Star';
import { dollars } from '@/lib/api';

export function MiniCart() {
  const { cart, cartOpen, setCartOpen, subtotalCents, itemCount, updateQty } = useCart();
  if (!cartOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={() => setCartOpen(false)} />
      <div className="drawer">
        <div style={{ padding: '24px 28px', borderBottom: '2.5px solid var(--ink)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="display" style={{ fontSize: 28 }}>Your basket</div>
            <div className="handwritten" style={{ fontSize: 18, color: 'var(--tomato)' }}>
              {cart.length === 0 ? 'nothing here yet!' : `${itemCount} lovely thing${itemCount === 1 ? '' : 's'}`}
            </div>
          </div>
          <button className="btn sm ghost" onClick={() => setCartOpen(false)}>Close ✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          {cart.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ marginBottom: 20 }}><Star size={60} color="var(--sun)" rotate={-15} /></div>
              <div style={{ fontFamily: 'Sniglet', fontSize: 20, fontWeight: 400, marginBottom: 10 }}>Nothing here yet</div>
              <div style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>Let&rsquo;s find a colouring book that makes someone small very happy.</div>
              <Link href="/shop" onClick={() => setCartOpen(false)} className="btn primary">Browse the shop →</Link>
            </div>
          )}
          {cart.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '2px dashed rgba(35,31,26,0.15)' }}>
              <div style={{ width: 70, flexShrink: 0 }}>
                <ProductCover product={item} showBadge={false} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Sniglet', fontWeight: 400, fontSize: 16 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Digital PDF · {item.pages} pages</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '2px solid var(--ink)', borderRadius: 999, padding: '2px 4px' }}>
                    <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>−</button>
                    <span style={{ minWidth: 20, textAlign: 'center', fontFamily: 'Sniglet', fontWeight: 400 }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>+</button>
                  </div>
                  <div style={{ fontFamily: 'Sniglet', fontWeight: 400 }}>{dollars(item.priceCents * item.qty)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div style={{ padding: '20px 28px', borderTop: '2.5px solid var(--ink)', background: 'var(--paper)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
              <span>Subtotal</span><span>{dollars(subtotalCents)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 14, color: 'var(--ink-soft)' }}>
              <span>Shipping</span><span>Free (it&rsquo;s digital!)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18, fontFamily: 'Sniglet', fontWeight: 800, fontSize: 22 }}>
              <span>Total</span><span>{dollars(subtotalCents)}</span>
            </div>
            <Link href="/checkout" onClick={() => setCartOpen(false)} className="btn primary lg" style={{ width: '100%' }}>
              Checkout →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
