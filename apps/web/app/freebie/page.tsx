'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FALLBACK_PRODUCTS } from '@/lib/api';
import type { Product } from '@/lib/types';
import { ProductCover } from '@/components/shared/ProductCover';
import { ProductBlob } from '@/components/shared/ProductBlob';
import { Star } from '@/components/shared/Star';

export default function FreebiePage() {
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/products`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProducts(d); })
      .catch(() => {});
  }, []);

  return (
    <div className="page" style={{ padding: '40px 32px 80px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 50, alignItems: 'center' }}>
        <div>
          <div className="handwritten" style={{ fontSize: 30, color: 'var(--tomato)', marginBottom: -4 }}>on the house</div>
          <h1 className="display" style={{ fontSize: 84, margin: '0 0 18px', lineHeight: 0.9 }}>Free<br />colouring<br />pack ✿</h1>
          <p style={{ fontSize: 18, color: 'var(--ink-soft)', marginBottom: 24, maxWidth: 480 }}>
            5 hand-picked pages from our best-selling books — yours to print as many times as you&rsquo;d like. Try before you buy, no credit card, no weird catches.
          </p>

          {submitted ? (
            <div className="card" style={{ background: 'var(--mint)' }}>
              <Star size={40} color="var(--sun)" rotate={-10} />
              <div className="display" style={{ fontSize: 28, margin: '10px 0 6px' }}>Check your inbox!</div>
              <div style={{ fontSize: 15 }}>We&rsquo;ve sent 5 pages to <b>{email}</b>. Happy colouring! 🎨</div>
              <Link href="/shop" className="btn primary sm" style={{ marginTop: 14, display: 'inline-block' }}>See the full shop →</Link>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input type="email" required placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1, minWidth: 240 }} />
              <button type="submit" className="btn primary lg">Send me the pack →</button>
            </form>
          )}

          <div style={{ marginTop: 22, display: 'flex', gap: 20, fontSize: 14, color: 'var(--ink-soft)', flexWrap: 'wrap' }}>
            <span>✓ No spam ever</span><span>✓ Unsubscribe with 1 click</span><span>✓ One email a month, max</span>
          </div>
        </div>

        <div style={{ position: 'relative', height: 540 }}>
          {[1, 3, 7, 11].map((idx, i) => products[idx] && (
            <div key={i} style={{
              position: 'absolute',
              top: [20, 60, 280, 320][i], left: [20, 180, 40, 200][i], width: 200,
              transform: `rotate(${[-12, 6, -3, 10][i]}deg)`, zIndex: i + 1,
            }}><ProductCover product={products[idx]} showBadge={false} /></div>
          ))}
          <div className="wiggle" style={{ position: 'absolute', top: 0, right: 20 }}><Star size={60} color="var(--sun)" rotate={15} /></div>
        </div>
      </div>

      <div style={{ marginTop: 80, padding: '50px 40px', background: 'var(--paper)', border: '2.5px solid var(--ink)', borderRadius: 28, boxShadow: '6px 6px 0 0 var(--ink)' }}>
        <h2 className="display" style={{ fontSize: 42, marginBottom: 24, textAlign: 'center' }}>What&rsquo;s in the free pack</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          {[0, 1, 3, 5, 11].map((idx, i) => products[idx] && (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ aspectRatio: '3/4', background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 8, padding: 12 }}>
                <ProductBlob color="transparent" accent="transparent" variant={idx} />
                <div style={{ position: 'absolute', bottom: 6, right: 10, fontFamily: 'Caveat', fontSize: 12, color: 'var(--ink-soft)' }}>pg. {i + 1}</div>
              </div>
              <div style={{ fontFamily: 'Sniglet', fontWeight: 400, fontSize: 13 }}>From {products[idx].title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
