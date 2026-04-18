import Link from 'next/link';

export default function AboutPage() {
  return (
    <div style={{ padding: '30px 0 40px' }}>
      <div className="page" style={{ maxWidth: 860 }}>
        <div className="handwritten" style={{ fontSize: 30, color: 'var(--tomato)', marginBottom: -4 }}>hi, we&rsquo;re glad you&rsquo;re here</div>
        <h1 className="display" style={{ fontSize: 84, margin: '0 0 24px', lineHeight: 0.9 }}>
          Two parents,<br />a kitchen table,<br />lots of crayons.
        </h1>
        <p style={{ fontSize: 20, color: 'var(--ink-soft)', marginBottom: 40, maxWidth: 640 }}>
          Jovie Joy started in 2023 when Mel and Ross couldn&rsquo;t find colouring pages they actually
          <i> liked</i> for their daughter Jovie (hi, namesake!). So they drew their own. Then their friends
          asked for copies. Then the friends&rsquo; friends did. Eventually they put them on Etsy.
        </p>
      </div>

      <div style={{ background: 'var(--sun)', padding: '60px 0', borderTop: '2.5px solid var(--ink)', borderBottom: '2.5px solid var(--ink)', margin: '40px 0' }}>
        <div className="page" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {['studio photo: mel and ross at the kitchen table', 'studio photo: printer + drawing tools', 'studio photo: jovie (2y old) colouring'].map((cap, i) => (
            <div key={i} style={{
              aspectRatio: '4/3', background: 'var(--paper)', border: '2.5px solid var(--ink)',
              borderRadius: 16, position: 'relative', overflow: 'hidden',
              transform: `rotate(${[-2, 1, -1][i]}deg)`,
            }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0, rgba(0,0,0,0.05) 2px, transparent 2px, transparent 14px)' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-soft)' }}>
                [{cap}]
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="page" style={{ maxWidth: 860 }}>
        <h2 className="display" style={{ fontSize: 44, marginBottom: 18 }}>Why we left Etsy</h2>
        <p style={{ fontSize: 17, color: 'var(--ink-soft)', marginBottom: 16 }}>
          Etsy was good to us for a while. But two things wore us down: one, the algorithm decided
          whether parents could find us — regardless of how good the work was. Two, every time Etsy ran
          a sale, we were encouraged to undercut our own prices to &ldquo;stay competitive.&rdquo; It didn&rsquo;t feel
          good, and it didn&rsquo;t pay the bills.
        </p>
        <p style={{ fontSize: 17, color: 'var(--ink-soft)', marginBottom: 16 }}>
          So we built our own shop. Now you pay less (no 6% Etsy fee), we make more, and we get to
          actually talk with the parents who use our books. Win-win-win.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, margin: '50px 0' }}>
          {[
            { n: '2,400+', l: 'books sold' },
            { n: '180+', l: '5-star reviews' },
            { n: '14,000', l: 'pages printed (that we know of)' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ background: ['var(--mint)', 'var(--sky)', 'var(--berry)'][i], color: i === 2 ? 'var(--cream)' : 'var(--ink)', textAlign: 'center' }}>
              <div className="display" style={{ fontSize: 56, lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontFamily: 'Sniglet', fontSize: 14 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <h2 className="display" style={{ fontSize: 44, marginBottom: 18 }}>Our promise</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[
            ['No AI', 'Every page is hand-drawn by Mel. No generative anything. Ever.'],
            ['No subscriptions', 'Pay once, own it forever. No renewals, no emails unless you want them.'],
            ['No ads in your inbox', 'One email a month, tops. You can unsubscribe any time with one click.'],
            ['Real humans', 'Email us at hello@joviejoy.com — Ross replies within a day, usually same-day.'],
          ].map(([t, d], i) => (
            <div key={i} className="card">
              <div className="display" style={{ fontSize: 22, marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 15, color: 'var(--ink-soft)' }}>{d}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <Link href="/shop" className="btn primary lg">See the books →</Link>
        </div>
      </div>
    </div>
  );
}
