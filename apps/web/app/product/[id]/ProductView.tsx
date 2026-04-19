'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Product } from '@/lib/types';
import { dollars } from '@/lib/api';
import { ProductCover } from '@/components/shared/ProductCover';
import { ProductBlob } from '@/components/shared/ProductBlob';
import { ProductCard } from '@/components/ProductCard';
import { useCart } from '@/components/CartProvider';

export function ProductView({ product, related }: { product: Product; related: Product[] }) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'details' | 'printing' | 'reviews'>('details');

  const images: Array<{ type: 'cover' } | { type: 'sample'; pageNum: number }> = [
    { type: 'cover' }, { type: 'sample', pageNum: 3 }, { type: 'sample', pageNum: 11 },
    { type: 'sample', pageNum: 22 }, { type: 'sample', pageNum: 34 },
  ];
  const variant = parseInt(product.id.replace('p', ''), 10) - 1;

  const samplePage = (num: number) => (
    <div style={{ width: '100%', height: '100%', background: 'var(--paper)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 20, border: '1px dashed rgba(0,0,0,0.1)', borderRadius: 4 }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '55%', height: '55%' }}>
        <ProductBlob color="transparent" accent="transparent" variant={(variant + num) % 12} />
      </div>
      <div style={{ position: 'absolute', bottom: 12, right: 16, fontFamily: 'Caveat', fontSize: 16, color: 'var(--ink-soft)' }}>pg. {num}</div>
      <div style={{ position: 'absolute', top: 12, left: 16, fontFamily: 'Caveat', fontSize: 14, color: 'var(--ink-soft)', opacity: 0.5 }}>jovie joy</div>
    </div>
  );

  return (
    <div style={{ padding: '30px 0 60px' }}>
      <div className="page">
        <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 20, fontFamily: 'Sniglet' }}>
          <Link href="/" style={{ color: 'var(--ink-soft)' }}>Home</Link>
          {' / '}
          <Link href="/shop" style={{ color: 'var(--ink-soft)' }}>Shop</Link>
          {' / '}<span style={{ color: 'var(--ink)' }}>{product.title}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60 }}>
          {/* Image carousel */}
          <div>
            <div style={{ position: 'relative', aspectRatio: '3/4', border: '2.5px solid var(--ink)', borderRadius: 24, overflow: 'hidden', background: product.color, boxShadow: '6px 6px 0 0 var(--ink)' }}>
              {images[imgIdx].type === 'cover' ? (
                <div style={{ padding: 20, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '80%', transform: 'rotate(-2deg)' }}>
                    <ProductCover product={product} showBadge={false} />
                  </div>
                </div>
              ) : samplePage((images[imgIdx] as { pageNum: number }).pageNum)}

              <button onClick={() => setImgIdx((imgIdx - 1 + images.length) % images.length)} style={navBtnStyle('left')}>‹</button>
              <button onClick={() => setImgIdx((imgIdx + 1) % images.length)} style={navBtnStyle('right')}>›</button>

              {product.badge && (
                <div className="sticker" style={{ top: 20, left: 20, background: product.badge === 'New' ? 'var(--mint)' : 'var(--sun)' }}>
                  {product.badge}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 14 }}>
              {images.map((img, i) => (
                <div key={i} onClick={() => setImgIdx(i)} style={{
                  aspectRatio: '3/4', border: `2.5px solid ${i === imgIdx ? 'var(--tomato)' : 'var(--ink)'}`,
                  borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                  background: img.type === 'cover' ? product.color : 'var(--paper)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: img.type === 'cover' ? 8 : 0,
                }}>
                  {img.type === 'cover' ? (
                    <div style={{ width: '75%' }}><ProductBlob color={product.color} accent={product.accent} variant={variant} /></div>
                  ) : (<div style={{ fontFamily: 'Caveat', fontSize: 14, color: 'var(--ink-soft)' }}>pg. {img.pageNum}</div>)}
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <span className="chip active">{product.theme}</span>
              <span className="chip">Ages {product.age}</span>
              <span className="chip">{product.difficulty}</span>
            </div>
            <h1 className="display" style={{ fontSize: 64, margin: '0 0 12px', lineHeight: 0.95 }}>{product.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <span style={{ color: 'var(--tomato)', fontFamily: 'Sniglet', fontWeight: 800 }}>★★★★★</span>
              <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>184 reviews · 98% would recommend</span>
            </div>

            <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', marginBottom: 24 }}>
              <div className="display" style={{ fontSize: 56 }}>{dollars(product.priceCents)}</div>
              <div style={{ fontSize: 15, color: 'var(--ink-soft)' }}>one-time · yours forever</div>
            </div>

            <p style={{ fontSize: 17, marginBottom: 26, color: 'var(--ink-soft)' }}>
              {product.description} Inside you&rsquo;ll find thick, confidence-building outlines perfect for crayons, markers, or coloured pencils — printed as many times as you like.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 26 }}>
              {[
                { i: '⚡', t: 'Instant PDF', d: 'Delivered to your email in seconds' },
                { i: '♾', t: 'Print forever', d: 'Unlimited prints at home' },
                { i: '🖨', t: 'US Letter + A4', d: 'Works with any printer' },
                { i: '💛', t: '30-day promise', d: "We'll make it right if it's not" },
              ].map(f => (
                <div key={f.t} style={{ padding: 12, background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 14 }}>
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{f.i}</div>
                  <div style={{ fontFamily: 'Sniglet', fontWeight: 400, fontSize: 14 }}>{f.t}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{f.d}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '2.5px solid var(--ink)', borderRadius: 999, padding: '4px 10px', background: 'var(--paper)', boxShadow: '4px 4px 0 0 var(--ink)' }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={qtyBtnStyle}>−</button>
                <span style={{ minWidth: 30, textAlign: 'center', fontFamily: 'Sniglet', fontWeight: 400 }}>{qty}</span>
                <button onClick={() => setQty(qty + 1)} style={qtyBtnStyle}>+</button>
              </div>
              <button className="btn primary lg" style={{ flex: 1 }} onClick={() => { for (let i = 0; i < qty; i++) addToCart(product, i === qty - 1); }}>
                Add to basket · {dollars(product.priceCents * qty)}
              </button>
            </div>
            <button className="btn sun" style={{ width: '100%' }} onClick={() => { addToCart(product, false); router.push('/checkout'); }}>
              Buy now →
            </button>

            <div style={{ marginTop: 40, borderBottom: '2.5px solid var(--ink)' }}>
              {(['details', 'printing', 'reviews'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '12px 20px', background: tab === t ? 'var(--sun)' : 'transparent',
                  border: '2.5px solid var(--ink)', borderBottom: 'none', borderRadius: '14px 14px 0 0',
                  fontFamily: 'Sniglet', fontWeight: 400, fontSize: 14, cursor: 'pointer',
                  marginRight: 6, marginBottom: -2.5, textTransform: 'capitalize',
                }}>{t}</button>
              ))}
            </div>
            <div style={{ padding: '20px 4px', fontSize: 15, color: 'var(--ink-soft)' }}>
              {tab === 'details' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 20px' }}>
                  <span style={{ fontFamily: 'Sniglet', fontWeight: 400, color: 'var(--ink)' }}>Pages</span><span>{product.pages}</span>
                  <span style={{ fontFamily: 'Sniglet', fontWeight: 400, color: 'var(--ink)' }}>Age range</span><span>{product.age} years</span>
                  <span style={{ fontFamily: 'Sniglet', fontWeight: 400, color: 'var(--ink)' }}>Difficulty</span><span>{product.difficulty}</span>
                  <span style={{ fontFamily: 'Sniglet', fontWeight: 400, color: 'var(--ink)' }}>Format</span><span>PDF, US Letter + A4</span>
                  <span style={{ fontFamily: 'Sniglet', fontWeight: 400, color: 'var(--ink)' }}>License</span><span>Personal + classroom (up to 30)</span>
                </div>
              )}
              {tab === 'printing' && (
                <div>
                  <p>Works with any inkjet or laser printer. 80–100gsm for crayons, 120gsm+ for markers (prevents bleed-through).</p>
                  <p>Files include a US Letter and an A4 version. For best fit, print &ldquo;Actual size&rdquo; (not &ldquo;Fit to page&rdquo;).</p>
                </div>
              )}
              {tab === 'reviews' && (
                <div>
                  {[
                    { n: 'Priya K.', s: 5, t: 'My 4yo is obsessed. Every car ride, this book comes out.' },
                    { n: 'Marc L.', s: 5, t: 'Printed 11 copies for a birthday party. Kids loved colouring them together.' },
                    { n: 'Sarah B.', s: 4, t: "Adorable illustrations. Wish there were a few more pages but can't complain for $8." },
                  ].map((r, i) => (
                    <div key={i} style={{ padding: '14px 0', borderBottom: '2px dashed rgba(35,31,26,0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'Sniglet', fontWeight: 400, color: 'var(--ink)' }}>{r.n}</span>
                        <span style={{ color: 'var(--tomato)' }}>{'★'.repeat(r.s)}{'☆'.repeat(5 - r.s)}</span>
                      </div>
                      <p style={{ margin: '4px 0 0' }}>{r.t}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 100 }}>
          <h2 className="display" style={{ fontSize: 42, marginBottom: 28 }}>You might also love</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
            {related.map((p, i) => (<ProductCard key={p.id} product={p} rotation={[-1, 1, -0.5, 0.5][i]} />))}
          </div>
        </div>
      </div>
    </div>
  );
}

const qtyBtnStyle: React.CSSProperties = { width: 30, height: 30, border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, fontFamily: 'Sniglet' };
function navBtnStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', [side]: 16, top: '50%', transform: 'translateY(-50%)',
    width: 46, height: 46, border: '2.5px solid var(--ink)', borderRadius: '50%',
    background: 'var(--paper)', cursor: 'pointer', fontFamily: 'Sniglet', fontWeight: 400, fontSize: 20,
    boxShadow: '3px 3px 0 0 var(--ink)',
  };
}
