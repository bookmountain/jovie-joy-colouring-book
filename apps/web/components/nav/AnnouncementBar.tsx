const ITEMS = [
  '🎨 Instant PDF download',
  '💌 Free colouring pack for signup',
  '🖍 Printed in-home 1000s of times',
  '📦 No shipping — print from anywhere',
  '✨ Made by parents, for parents',
];

export function AnnouncementBar() {
  const all = [...ITEMS, ...ITEMS, ...ITEMS];
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
