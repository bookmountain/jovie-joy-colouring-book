'use client';

import { useEffect, useState } from 'react';

const FALLBACK = [
  '🎨 Instant PDF download',
  '💌 Free colouring pack for signup',
  '🖍 Printed in-home 1000s of times',
  '📦 No shipping — print from anywhere',
  '✨ Made by parents, for parents',
];

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5080';

export function AnnouncementBar() {
  const [items, setItems] = useState(FALLBACK);

  useEffect(() => {
    fetch(`${API}/api/content`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { key: string; value: string }[] | null) => {
        if (!data) return;
        const map = Object.fromEntries(data.map(i => [i.key, i.value]));
        const loaded = [1, 2, 3, 4, 5]
          .map(n => map[`marquee.${n}`])
          .filter(Boolean);
        if (loaded.length > 0) setItems(loaded);
      })
      .catch(() => {});
  }, []);

  const all = [...items, ...items, ...items];
  return (
    <div style={{ background: 'var(--ink)', color: 'var(--cream)', padding: '10px 0', overflow: 'hidden', borderBottom: '2.5px solid var(--ink)' }}>
      <div className="marquee" style={{ fontFamily: 'Sniglet, sans-serif', fontSize: 14 }}>
        {all.map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 40 }}>
            {t}<span style={{ color: 'var(--sun)' }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
