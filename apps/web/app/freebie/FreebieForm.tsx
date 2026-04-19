'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star } from '@/components/shared/Star';

export function FreebieForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="card" style={{ background: 'var(--mint)' }}>
        <Star size={40} color="var(--sun)" rotate={-10} />
        <div className="display" style={{ fontSize: 28, margin: '10px 0 6px' }}>Check your inbox!</div>
        <div style={{ fontSize: 15 }}>We&rsquo;ve sent 5 pages to <b>{email}</b>. Happy colouring! 🎨</div>
        <Link href="/shop" className="btn primary sm" style={{ marginTop: 14, display: 'inline-block' }}>See the full shop →</Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
      style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
    >
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ flex: 1, minWidth: 240 }}
      />
      <button type="submit" className="btn primary lg">Send me the pack →</button>
    </form>
  );
}
