'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/components/CartProvider';
import { ProductCover } from '@/components/shared/ProductCover';
import { Star } from '@/components/shared/Star';
import { createCheckoutSession, dollars } from '@/lib/api';

export default function CheckoutPage() {
  const { cart, subtotalCents } = useCart();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [promo, setPromo] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discount = promoApplied ? Math.round(subtotalCents * 0.1) : 0;
  const total = subtotalCents - discount;

  if (cart.length === 0) {
    return (
      <div className="page" style={{ padding: '80px 32px', textAlign: 'center' }}>
        <Star size={80} color="var(--sun)" rotate={-15} />
        <h1 className="display" style={{ fontSize: 48, margin: '20px 0 10px' }}>Basket is empty!</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 24 }}>Pop over to the shop and pick a book first.</p>
        <Link href="/shop" className="btn primary">Browse shop →</Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { checkoutUrl } = await createCheckoutSession({
        email, name: name || null,
        items: cart.map(i => ({ productId: i.id, quantity: i.qty })),
        promoCode: promoApplied && promo.trim() ? promo.trim().toUpperCase() : null,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  };

  return (
    <div className="page" style={{ padding: '30px 32px 80px' }}>
      <div style={{ marginBottom: 30 }}>
        <div className="handwritten" style={{ fontSize: 28, color: 'var(--tomato)', marginBottom: -4 }}>almost there!</div>
        <h1 className="display" style={{ fontSize: 56, margin: 0 }}>Checkout</h1>
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40 }}>
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="display" style={{ fontSize: 24, marginBottom: 16 }}>1. Where should we send your PDFs?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label>Your name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Parent" /></div>
              <div><label>Email address</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" /></div>
            </div>
            <div style={{ marginTop: 14, padding: 12, background: 'var(--cream-2)', borderRadius: 12, fontSize: 13, color: 'var(--ink-soft)' }}>
              💡 We&rsquo;ll send an account link too — so you can re-download your files anytime, forever.
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="display" style={{ fontSize: 24, marginBottom: 16 }}>2. Payment</div>
            <div style={{ padding: 14, background: 'var(--sun)', border: '2px solid var(--ink)', borderRadius: 14, fontSize: 14 }}>
              🔒 You&rsquo;ll be redirected to Stripe&rsquo;s secure checkout — card, Apple Pay, Google Pay all supported.
            </div>
          </div>

          <div className="card">
            <div className="display" style={{ fontSize: 24, marginBottom: 12 }}>3. Promo code?</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="text" placeholder="Try FIRST10" value={promo} onChange={e => setPromo(e.target.value)} />
              <button type="button" className="btn sun" onClick={() => { if (promo.trim()) setPromoApplied(true); }}>
                {promoApplied ? 'Applied ✓' : 'Apply'}
              </button>
            </div>
            {promoApplied && (
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--tomato)', fontFamily: 'Sniglet', fontWeight: 800 }}>✓ 10% off applied!</div>
            )}
          </div>
        </div>

        <div>
          <div className="card" style={{ background: 'var(--cream-2)', position: 'sticky', top: 20 }}>
            <div className="display" style={{ fontSize: 24, marginBottom: 16 }}>Your order</div>
            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '2px dashed rgba(35,31,26,0.15)' }}>
                <div style={{ width: 56, flexShrink: 0 }}><ProductCover product={item} showBadge={false} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Sniglet', fontWeight: 800, fontSize: 15 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Qty {item.qty} · {dollars(item.priceCents)} each</div>
                </div>
                <div style={{ fontFamily: 'Sniglet', fontWeight: 800 }}>{dollars(item.priceCents * item.qty)}</div>
              </div>
            ))}

            <div style={{ padding: '14px 0', display: 'grid', gap: 6, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{dollars(subtotalCents)}</span></div>
              {promoApplied && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--tomato)' }}>
                  <span>Discount (FIRST10)</span><span>−{dollars(discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-soft)' }}>
                <span>Shipping</span><span>Free · digital!</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, borderTop: '2.5px solid var(--ink)', marginBottom: 18 }}>
              <div className="display" style={{ fontSize: 22 }}>Total</div>
              <div className="display" style={{ fontSize: 32 }}>{dollars(total)}</div>
            </div>

            <button type="submit" disabled={submitting} className="btn primary lg" style={{ width: '100%', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Redirecting…' : `Pay ${dollars(total)} + download →`}
            </button>
            {error && <div style={{ marginTop: 10, color: 'var(--tomato)', fontSize: 13, textAlign: 'center' }}>{error}</div>}

            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-soft)', textAlign: 'center' }}>
              🔒 Secure checkout · 30-day guarantee · instant delivery
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
