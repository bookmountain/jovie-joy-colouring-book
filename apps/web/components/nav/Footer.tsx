import { Squiggle } from '../shared/Squiggle';

const COLS = [
  { t: 'Shop', links: ['All books', 'For 3–5', 'For 5–8', 'For 8–12', 'Bundles'] },
  { t: 'Jovie', links: ['Our story', 'FAQ', 'Licensing', 'Affiliates'] },
  { t: 'Help', links: ['Downloads', 'Printing tips', 'Contact', 'Refunds'] },
];

export function Footer() {
  return (
    <footer style={{ background: 'var(--ink)', color: 'var(--cream)', padding: '80px 32px 32px', marginTop: 80, position: 'relative', overflow: 'hidden' }}>
      <Squiggle color="var(--sun)" height={20} />
      <div className="page" style={{ padding: '40px 0 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 50 }}>
          <div>
            <div style={{ fontFamily: 'Sniglet', fontSize: 36, fontWeight: 800, marginBottom: 8 }}>
              jovie joy<span style={{ display: 'inline-block', width: 20, height: 20, background: 'var(--tomato)', border: '2.5px solid var(--cream)', borderRadius: '50%', transform: 'translateY(-8px)', marginLeft: 4 }} />
            </div>
            <div style={{ maxWidth: 340, opacity: 0.8, fontSize: 15 }}>
              Small-studio digital colouring books, made by two parents on a kitchen table in Wyoming. Print as many times as you like. Forever.
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              {['IG', 'PT', 'TT', 'YT'].map(s => (
                <div key={s} style={{ width: 40, height: 40, border: '2.5px solid var(--cream)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sniglet', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{s}</div>
              ))}
            </div>
          </div>
          {COLS.map(col => (
            <div key={col.t}>
              <div style={{ fontFamily: 'Sniglet', fontWeight: 800, fontSize: 16, marginBottom: 14 }}>{col.t}</div>
              {col.links.map(l => (
                <div key={l} style={{ opacity: 0.7, fontSize: 14, padding: '4px 0', cursor: 'pointer' }}>{l}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '2px dashed rgba(255,247,235,0.25)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.6 }}>
          <span>© 2026 Jovie Joy Studios · Handmade in Wyoming</span>
          <span>Privacy · Terms · Cookies</span>
        </div>
      </div>
      <svg width="140" height="140" style={{ position: 'absolute', top: 30, right: 40, opacity: 0.15 }} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="25" fill="var(--sun)"/>
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30) * Math.PI / 180;
          return <line key={i} x1={50 + Math.cos(a) * 32} y1={50 + Math.sin(a) * 32} x2={50 + Math.cos(a) * 42} y2={50 + Math.sin(a) * 42} stroke="var(--sun)" strokeWidth="4" strokeLinecap="round" />;
        })}
      </svg>
    </footer>
  );
}
