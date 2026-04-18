import type { Product } from '@/lib/types';
import { ProductBlob } from './ProductBlob';

export function ProductCover({ product, showBadge = true, rotation = 0 }: { product: Product; showBadge?: boolean; rotation?: number }) {
  const variant = parseInt(product.id.replace('p', ''), 10) - 1;
  return (
    <div className="product-img" style={{ background: product.color, transform: rotation ? `rotate(${rotation}deg)` : undefined }}>
      <div className="stripes" />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '75%', height: '70%' }}>
          <ProductBlob color={product.color} accent={product.accent} variant={variant} />
        </div>
      </div>
      <div style={{ position: 'absolute', top: 14, left: 14, right: 14, textAlign: 'center' }}>
        <div style={{ fontFamily: 'Sniglet, sans-serif', fontWeight: 800, fontSize: 16, lineHeight: 1, color: 'var(--ink)' }}>
          {product.title}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontFamily: 'Caveat, cursive', fontSize: 18, color: 'var(--ink)', opacity: 0.7 }}>
        ~ jovie joy ~
      </div>
      {showBadge && product.badge && (
        <div className="sticker" style={{ top: -10, right: -6, background: product.badge === 'New' ? 'var(--mint)' : 'var(--sun)' }}>
          {product.badge}
        </div>
      )}
    </div>
  );
}
