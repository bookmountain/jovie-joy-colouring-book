'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductCover } from './shared/ProductCover';
import { useCart } from './CartProvider';
import { dollars } from '@/lib/api';

export function ProductCard({ product, rotation = 0 }: { product: Product; rotation?: number }) {
  const { addToCart } = useCart();
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: 'pointer',
        transform: `rotate(${hover ? 0 : rotation}deg) translateY(${hover ? -4 : 0}px)`,
        transition: 'transform .25s ease',
      }}>
      <Link href={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <ProductCover product={product} />
        </div>
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <Link href={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
            <div className="display" style={{ fontSize: 22 }}>{product.title}</div>
          </Link>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            Ages {product.age} · {product.pages} pages · {product.difficulty}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="display" style={{ fontSize: 22 }}>{dollars(product.priceCents)}</div>
          <button className="btn sm primary" style={{ marginTop: 4 }} onClick={(e) => { e.preventDefault(); addToCart(product); }}>
            Add +
          </button>
        </div>
      </div>
    </div>
  );
}
