import Link from 'next/link';
import { fetchProducts, fetchSiteContent } from '@/lib/api';
import { ProductCover } from '@/components/shared/ProductCover';
import { ProductCard } from '@/components/ProductCard';
import { Star } from '@/components/shared/Star';
import { Squiggle } from '@/components/shared/Squiggle';
import { HomeFaq } from './_home/HomeFaq';

export default async function HomePage() {
  const [products, content] = await Promise.all([fetchProducts(), fetchSiteContent()]);
  const featured = products.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section style={{ position: 'relative', padding: '40px 0 80px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 60, left: -40, width: 120, height: 120, background: 'var(--sun)', border: '2.5px solid var(--ink)', borderRadius: '50%', zIndex: 0 }} className="bob" />
        <div style={{ position: 'absolute', top: 200, right: 40, zIndex: 0 }} className="wiggle"><Star size={80} color="var(--berry)" rotate={15} /></div>
        <div style={{ position: 'absolute', bottom: 60, right: 120, zIndex: 0 }}><Star size={40} color="var(--mint)" rotate={-20} /></div>

        <div className="page" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 60, alignItems: 'center' }}>
            <div className="fade-up">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--mint)', border: '2.5px solid var(--ink)', borderRadius: 999, fontFamily: 'Sniglet, sans-serif', fontSize: 13, marginBottom: 20 }}>
                <span style={{ width: 8, height: 8, background: 'var(--ink)', borderRadius: '50%' }} />
                {content['home.announcement'] ?? 'Leaving Etsy · Lower prices, bigger smiles'}
              </div>
              <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 96px)', margin: '0 0 20px' }}>
                Printable<br />
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  colouring
                  <svg style={{ position: 'absolute', bottom: -8, left: 0, width: '100%', height: 16 }} viewBox="0 0 300 16" preserveAspectRatio="none">
                    <path d="M5 10 Q 75 2, 150 8 T 295 6" stroke="var(--tomato)" strokeWidth="6" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
                <br />books for<br />tiny hands.
              </h1>
              <p style={{ fontSize: 19, maxWidth: 500, marginBottom: 30, color: 'var(--ink-soft)' }}>
                {content['home.hero.subtext'] ?? 'Instant-download PDFs made by parents who were tired of the algorithm. Print as many times as you like, keep the file forever, and colour quiet rainy afternoons away.'}
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <Link href="/shop" className="btn primary lg">Browse the shop →</Link>
                <Link href="/freebie" className="btn sun">Get 5 free pages</Link>
              </div>
              <div style={{ marginTop: 40, display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ display: 'flex' }}>
                  {['var(--tomato)', 'var(--mint)', 'var(--sky)', 'var(--sun)'].map((c, i) => (
                    <div key={i} style={{ width: 40, height: 40, borderRadius: '50%', background: c, border: '2.5px solid var(--ink)', marginLeft: i === 0 ? 0 : -10 }} />
                  ))}
                </div>
                <div>
                  <div style={{ fontFamily: 'Sniglet', fontWeight: 800, fontSize: 17 }}>★★★★★ 4.9</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>from 2,400+ parents</div>
                </div>
              </div>
            </div>

            <div style={{ position: 'relative', height: 540 }}>
              {products[0] && <div style={{ position: 'absolute', top: 20, left: 20, width: 260, transform: 'rotate(-6deg)', zIndex: 1 }} className="bob"><ProductCover product={products[0]} showBadge={false} /></div>}
              {products[4] && <div style={{ position: 'absolute', top: 60, right: 0, width: 260, transform: 'rotate(5deg)', zIndex: 2 }}><ProductCover product={products[4]} showBadge={false} /></div>}
              {products[9] && <div style={{ position: 'absolute', bottom: 10, left: 60, width: 260, transform: 'rotate(3deg)', zIndex: 3 }}><ProductCover product={products[9]} showBadge={false} /></div>}
              <div style={{ position: 'absolute', bottom: 30, right: 0, transform: 'rotate(6deg)', zIndex: 4 }}>
                <div className="handwritten" style={{ fontSize: 28, color: 'var(--tomato)', lineHeight: 1 }}>
                  pages that keep<br /><span style={{ fontSize: 36 }}>tiny hands busy →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '60px 0', background: 'var(--cream-2)', position: 'relative' }}>
        <Squiggle color="var(--ink)" height={16} />
        <div className="page" style={{ padding: '40px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div className="handwritten" style={{ fontSize: 28, color: 'var(--tomato)', marginBottom: -6 }}>so, how does this work?</div>
            <h2 className="display" style={{ fontSize: 56, margin: 0 }}>Three tiny steps</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
            {[
              { n: '01', t: 'Pick a book', d: 'Browse by age, theme, or pure vibes. Every book is 36–52 pages of colour-ready fun.', color: 'var(--sun)', rot: -1.5 },
              { n: '02', t: 'Pay once', d: 'No subscriptions. No mailing lists unless you ask. $8–11 gets you the whole PDF, forever.', color: 'var(--sky)', rot: 0.5 },
              { n: '03', t: 'Print forever', d: 'Rainy day? Birthday party? Waiting room? Print fresh pages whenever. The file is yours.', color: 'var(--berry)', rot: -0.5 },
            ].map(s => (
              <div key={s.n} className="card" style={{ background: s.color, transform: `rotate(${s.rot}deg)` }}>
                <div className="display" style={{ fontSize: 64, color: 'var(--paper)', WebkitTextStroke: '2.5px var(--ink)', lineHeight: 1, marginBottom: 10 }}>{s.n}</div>
                <div className="display" style={{ fontSize: 28, marginBottom: 8 }}>{s.t}</div>
                <div style={{ fontSize: 15 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
        <Squiggle color="var(--ink)" height={16} />
      </section>

      {/* Featured */}
      <section style={{ padding: '80px 0' }}>
        <div className="page">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
            <div>
              <div className="handwritten" style={{ fontSize: 24, color: 'var(--berry)' }}>popular right now</div>
              <h2 className="display" style={{ fontSize: 54, margin: 0 }}>Fan favourites</h2>
            </div>
            <Link href="/shop" className="btn ghost">See all 12 →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} rotation={i % 2 === 0 ? -1 : 1} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '80px 0', background: 'var(--ink)', color: 'var(--cream)' }}>
        <div className="page">
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div className="handwritten" style={{ fontSize: 28, color: 'var(--sun)' }}>kind words from kitchen tables</div>
            <h2 className="display" style={{ fontSize: 56, margin: 0 }}>Parents who get it</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { q: 'My 4yo asked for "the bunny book" every single car ride. Best $8 ever spent.', a: 'Priya · mom of 2', color: 'var(--sun)' },
              { q: 'Printed Space Cadet Club 11 times for a birthday party. Kids obsessed.', a: 'Marc · dad of 1', color: 'var(--sky)' },
              { q: 'Honestly the only screen-free activity that lasts longer than 6 minutes.', a: 'Taylor · mom of 3', color: 'var(--berry)', w: true },
              { q: 'Art teacher here — I use these as warm-ups. Kids love the line quality.', a: 'Ms. Lena · K–2 art', color: 'var(--mint)' },
            ].map((q, i) => (
              <div key={i} style={{ background: q.color, color: q.w ? 'var(--cream)' : 'var(--ink)', border: '2.5px solid var(--cream)', borderRadius: 20, padding: 22, transform: `rotate(${[-2, 1, -1, 2][i]}deg)` }}>
                <div style={{ fontSize: 32, lineHeight: 0.5, marginBottom: 6, fontFamily: 'Sniglet' }}>&ldquo;</div>
                <div style={{ fontSize: 16, marginBottom: 16, lineHeight: 1.4 }}>{q.q}</div>
                <div style={{ fontFamily: 'Sniglet', fontWeight: 800, fontSize: 13 }}>— {q.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Freebie CTA */}
      <section style={{ padding: '80px 0' }}>
        <div className="page">
          <div style={{
            background: 'var(--tomato)', border: '2.5px solid var(--ink)', borderRadius: 36,
            padding: '60px 50px', boxShadow: '8px 8px 0 0 var(--ink)',
            display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 40, alignItems: 'center',
            color: 'var(--cream)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -30, right: -30, zIndex: 0 }}><Star size={200} color="var(--sun)" rotate={15} /></div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="handwritten" style={{ fontSize: 30, color: 'var(--sun)', marginBottom: -4 }}>psst — freebie inside</div>
              <h2 className="display" style={{ fontSize: 58, margin: '0 0 16px' }}>5 pages,<br />on the house.</h2>
              <p style={{ fontSize: 17, maxWidth: 420, marginBottom: 24, opacity: 0.9 }}>
                Pop your email in and we&rsquo;ll send you a sample pack — one from each of our best-selling books. See the quality before you buy.
              </p>
              <Link href="/freebie" className="btn sun lg">Send me the pack →</Link>
            </div>
            <div style={{ position: 'relative', height: 300, zIndex: 1 }}>
              {products[3] && <div style={{ position: 'absolute', top: 0, left: 20, width: 180, transform: 'rotate(-8deg)' }}><ProductCover product={products[3]} showBadge={false} /></div>}
              {products[11] && <div style={{ position: 'absolute', top: 40, right: 0, width: 180, transform: 'rotate(10deg)' }}><ProductCover product={products[11]} showBadge={false} /></div>}
            </div>
          </div>
        </div>
      </section>

      <HomeFaq />
    </>
  );
}
