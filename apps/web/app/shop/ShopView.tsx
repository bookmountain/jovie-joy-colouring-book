'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { AGES, THEMES, DIFFICULTIES } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { ProductCover } from '@/components/shared/ProductCover';

export function ShopView({ products }: { products: Product[] }) {
  const [age, setAge] = useState('All ages');
  const [theme, setTheme] = useState('All themes');
  const [diff, setDiff] = useState('Any');
  const [sort, setSort] = useState('Popular');
  const [search, setSearch] = useState('');

  const filtered = products.filter(p => {
    if (age !== 'All ages' && p.age !== age) return false;
    if (theme !== 'All themes' && p.theme !== theme) return false;
    if (diff !== 'Any' && p.difficulty !== diff) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'Price: low') return a.priceCents - b.priceCents;
    if (sort === 'Price: high') return b.priceCents - a.priceCents;
    if (sort === 'Pages: most') return b.pages - a.pages;
    return 0;
  });

  return (
    <div style={{ padding: '30px 0 60px' }}>
      <div className="page">
        <div style={{ marginBottom: 40 }}>
          <div className="handwritten" style={{ fontSize: 28, color: 'var(--tomato)', marginBottom: -4 }}>the whole collection</div>
          <h1 className="display" style={{ fontSize: 72, margin: 0 }}>Shop all books</h1>
          <p style={{ fontSize: 17, color: 'var(--ink-soft)', maxWidth: 600, marginTop: 8 }}>
            Every book is an instant PDF. Print as many times as you like, forever. $8–11 each, or bundle and save.
          </p>
        </div>

        <div style={{ background: 'var(--paper)', border: '2.5px solid var(--ink)', borderRadius: 24, padding: 24, marginBottom: 30, boxShadow: '4px 4px 0 0 var(--ink)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label>Search</label>
              <input type="text" placeholder="Looking for dinos?" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div>
              <label>Age</label>
              <select value={age} onChange={e => setAge(e.target.value)}>{AGES.map(a => <option key={a}>{a}</option>)}</select>
            </div>
            <div>
              <label>Theme</label>
              <select value={theme} onChange={e => setTheme(e.target.value)}>{THEMES.map(t => <option key={t}>{t}</option>)}</select>
            </div>
            <div>
              <label>Difficulty</label>
              <select value={diff} onChange={e => setDiff(e.target.value)}>{DIFFICULTIES.map(d => <option key={d}>{d}</option>)}</select>
            </div>
            <div>
              <label>Sort by</label>
              <select value={sort} onChange={e => setSort(e.target.value)}>{['Popular', 'Price: low', 'Price: high', 'Pages: most'].map(s => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '2px dashed rgba(35,31,26,0.15)' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Under $10', 'Bestsellers', 'Easy', 'New'].map(q => (<div key={q} className="chip">{q}</div>))}
            </div>
            <div style={{ fontFamily: 'Sniglet', fontWeight: 400, fontSize: 14 }}>
              {sorted.length} book{sorted.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div className="display" style={{ fontSize: 40, marginBottom: 12 }}>No matches 🤔</div>
            <div style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>Try loosening your filters.</div>
            <button className="btn" onClick={() => { setAge('All ages'); setTheme('All themes'); setDiff('Any'); setSearch(''); }}>Clear filters</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, rowGap: 50 }}>
            {sorted.map((p, i) => (
              <ProductCard key={p.id} product={p} rotation={[-1, 1, -0.5, 0.5][i % 4]} />
            ))}
          </div>
        )}

        {/* Bundle promo */}
        <div style={{
          marginTop: 80, padding: '50px 40px', background: 'var(--sky)',
          border: '2.5px solid var(--ink)', borderRadius: 28, boxShadow: '6px 6px 0 0 var(--ink)',
          display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 30, alignItems: 'center',
        }}>
          <div>
            <div className="handwritten" style={{ fontSize: 28, color: 'var(--tomato)' }}>better together</div>
            <h2 className="display" style={{ fontSize: 48, margin: '0 0 10px' }}>Buy 3, get 1 free</h2>
            <p style={{ fontSize: 16, maxWidth: 500, marginBottom: 20 }}>Build a bundle of any 4 books — the cheapest is on us. Perfect for birthday gifts, summer break, or a long road trip.</p>
            <button className="btn primary">Build a bundle →</button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 4, 9, 11].map((idx, i) => products[idx] && (
              <div key={i} style={{ flex: 1, transform: `rotate(${[-4, 3, -2, 5][i]}deg)` }}>
                <ProductCover product={products[idx]} showBadge={false} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
