'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useCart } from '@/components/CartProvider';
import { Star } from '@/components/shared/Star';

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();
  useEffect(() => { clearCart(); }, [clearCart]);

  return (
    <div className="page" style={{ padding: '40px 32px 80px', maxWidth: 760 }}>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <div className="bob" style={{ display: 'inline-block' }}><Star size={100} color="var(--sun)" rotate={0} /></div>
        <div className="handwritten" style={{ fontSize: 30, color: 'var(--tomato)' }}>yay, all done!</div>
        <h1 className="display" style={{ fontSize: 56, margin: '0 0 10px' }}>Your books are ready.</h1>
        <p style={{ fontSize: 17, color: 'var(--ink-soft)' }}>Check your inbox for the download links — they&rsquo;ll arrive in a minute or two.</p>
      </div>

      <div style={{ padding: 20, background: 'var(--mint)', border: '2.5px solid var(--ink)', borderRadius: 20 }}>
        <div className="display" style={{ fontSize: 20, marginBottom: 6 }}>What happens next?</div>
        <div style={{ fontSize: 14 }}>
          <div>✓ Check your inbox for download links (files are yours forever in your account)</div>
          <div>✓ Print at home on any printer, US Letter or A4</div>
          <div>✓ Tag us <b>@joviejoy</b> with photos — we repost kid masterpieces every Sunday</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 30 }}>
        <Link href="/" className="btn">Back to home →</Link>
      </div>
    </div>
  );
}
