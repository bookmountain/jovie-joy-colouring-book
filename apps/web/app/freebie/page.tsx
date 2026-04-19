import { fetchProducts, fetchSiteContent } from '@/lib/api';
import { ProductCover } from '@/components/shared/ProductCover';
import { ProductBlob } from '@/components/shared/ProductBlob';
import { Star } from '@/components/shared/Star';
import { FreebieForm } from './FreebieForm';

function lines(s: string) {
  return s.split('\n');
}

export default async function FreebiePage() {
  const [products, content] = await Promise.all([fetchProducts(), fetchSiteContent()]);

  const tagline = content['freebie.tagline'] ?? 'on the house';
  const headline = content['freebie.headline'] ?? 'Free\ncolouring\npack ✿';
  const subtext = content['freebie.subtext'] ?? "5 hand-picked pages from our best-selling books — yours to print as many times as you'd like. Try before you buy, no credit card, no weird catches.";

  return (
    <div className="page" style={{ padding: '40px 32px 80px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 50, alignItems: 'center' }}>
        <div>
          <div className="handwritten" style={{ fontSize: 30, color: 'var(--tomato)', marginBottom: -4 }}>{tagline}</div>
          <h1 className="display" style={{ fontSize: 84, margin: '0 0 18px', lineHeight: 0.9 }}>
            {lines(headline).map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </h1>
          <p style={{ fontSize: 18, color: 'var(--ink-soft)', marginBottom: 24, maxWidth: 480 }}>
            {subtext}
          </p>

          <FreebieForm />

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
