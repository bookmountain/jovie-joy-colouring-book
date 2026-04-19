import Link from 'next/link';
import { fetchSiteContent } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

function photoUrl(val: string) {
  if (!val) return null;
  return val.startsWith('/uploads') ? `${API}${val}` : val;
}

export default async function AboutPage() {
  const content = await fetchSiteContent();

  const headline = content['about.headline'] ?? 'Two parents, a kitchen table, lots of crayons.';
  const intro = content['about.intro'] ?? "Jovie Joy started in 2023 when Mel and Ross couldn't find colouring pages they actually liked for their daughter Jovie (hi, namesake!). So they drew their own. Then their friends asked for copies. Then the friends' friends did. Eventually they put them on Etsy.";

  const photos = [1, 2, 3].map(n => ({
    src: photoUrl(content[`about.photo.${n}`] ?? ''),
    caption: content[`about.photo.${n}.caption`] ?? `studio photo ${n}`,
  }));

  const etsy = {
    para1: content['about.etsy.para1'] ?? "Etsy was good to us for a while. But two things wore us down: one, the algorithm decided whether parents could find us — regardless of how good the work was. Two, every time Etsy ran a sale, we were encouraged to undercut our own prices to \u201cstay competitive.\u201d It didn\u2019t feel good, and it didn\u2019t pay the bills.",
    para2: content['about.etsy.para2'] ?? "So we built our own shop. Now you pay less (no 6% Etsy fee), we make more, and we get to actually talk with the parents who use our books. Win-win-win.",
  };

  const stats = [1, 2, 3].map((n, i) => ({
    n: content[`about.stat.${n}.n`] ?? ['2,400+', '180+', '14,000'][i],
    l: content[`about.stat.${n}.l`] ?? ['books sold', '5-star reviews', 'pages printed (that we know of)'][i],
    color: ['var(--mint)', 'var(--sky)', 'var(--berry)'][i],
    light: i < 2,
  }));

  const promises = [1, 2, 3, 4].map((n, i) => ({
    t: content[`about.promise.${n}.title`] ?? ['No AI', 'No subscriptions', 'No ads in your inbox', 'Real humans'][i],
    d: content[`about.promise.${n}.desc`] ?? [
      'Every page is hand-drawn by Mel. No generative anything. Ever.',
      'Pay once, own it forever. No renewals, no emails unless you want them.',
      'One email a month, tops. You can unsubscribe any time with one click.',
      'Email us at hello@joviejoy.com — Ross replies within a day, usually same-day.',
    ][i],
  }));

  return (
    <div style={{ padding: '30px 0 40px' }}>
      <div className="page" style={{ maxWidth: 860 }}>
        <div className="handwritten" style={{ fontSize: 30, color: 'var(--tomato)', marginBottom: -4 }}>hi, we&rsquo;re glad you&rsquo;re here</div>
        <h1 className="display" style={{ fontSize: 84, margin: '0 0 24px', lineHeight: 0.9 }}>
          {headline.split(',').map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 ? ',' : ''}<br /></span>
          ))}
        </h1>
        <p style={{ fontSize: 20, color: 'var(--ink-soft)', marginBottom: 40, maxWidth: 640 }}>
          {intro}
        </p>
      </div>

      <div style={{ background: 'var(--sun)', padding: '60px 0', borderTop: '2.5px solid var(--ink)', borderBottom: '2.5px solid var(--ink)', margin: '40px 0' }}>
        <div className="page" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {photos.map((photo, i) => (
            <div key={i} style={{
              aspectRatio: '4/3', background: 'var(--paper)', border: '2.5px solid var(--ink)',
              borderRadius: 16, position: 'relative', overflow: 'hidden',
              transform: `rotate(${[-2, 1, -1][i]}deg)`,
            }}>
              {photo.src ? (
                <img src={photo.src} alt={photo.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0, rgba(0,0,0,0.05) 2px, transparent 2px, transparent 14px)' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: 'var(--ink-soft)' }}>
                    [{photo.caption}]
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="page" style={{ maxWidth: 860 }}>
        <h2 className="display" style={{ fontSize: 44, marginBottom: 18 }}>Why we left Etsy</h2>
        <p style={{ fontSize: 17, color: 'var(--ink-soft)', marginBottom: 16 }}>{etsy.para1}</p>
        <p style={{ fontSize: 17, color: 'var(--ink-soft)', marginBottom: 16 }}>{etsy.para2}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, margin: '50px 0' }}>
          {stats.map((s, i) => (
            <div key={i} className="card" style={{ background: s.color, color: s.light ? 'var(--ink)' : 'var(--cream)', textAlign: 'center' }}>
              <div className="display" style={{ fontSize: 56, lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontFamily: 'Sniglet', fontSize: 14 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <h2 className="display" style={{ fontSize: 44, marginBottom: 18 }}>Our promise</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {promises.map((p, i) => (
            <div key={i} className="card">
              <div className="display" style={{ fontSize: 22, marginBottom: 4 }}>{p.t}</div>
              <div style={{ fontSize: 15, color: 'var(--ink-soft)' }}>{p.d}</div>
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
