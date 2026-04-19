'use client';

import { useState } from 'react';
import type { SiteContentMap } from '@/lib/api';

const FALLBACK_FAQS = [
  { q: 'How does the download work?', a: "After checkout you'll get an instant email with your PDF link. You can also download it straight from the confirmation page. The file is yours — redownload anytime from your account." },
  { q: 'Can I print these as many times as I want?', a: "Yes! That's the whole point. Spill juice on page 7? Print another. Want copies for the whole classroom? Go for it (up to 30 kids per license)." },
  { q: 'What printer should I use?', a: 'Any home printer works. We design with inkjet in mind but laser is great too. Standard 8.5×11 US Letter, or pop into A4 mode for A4 paper.' },
  { q: 'Why did you leave Etsy?', a: 'Short answer: we wanted to talk to you directly, without an algorithm deciding whether you saw us. Long answer: on our About page.' },
  { q: 'Can I get a refund?', a: "Since these are digital, we can't \"take them back\" — but if something's wrong with your file, email us within 14 days and we'll make it right. Always." },
];

export function HomeFaq({ content }: { content: SiteContentMap }) {
  const [open, setOpen] = useState(0);

  const faqs = [1, 2, 3, 4, 5].map((n, i) => ({
    q: content[`faq.${n}.q`] || FALLBACK_FAQS[i].q,
    a: content[`faq.${n}.a`] || FALLBACK_FAQS[i].a,
  }));

  return (
    <section style={{ padding: '80px 0', background: 'var(--cream-2)' }}>
      <div className="page" style={{ maxWidth: 860 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="handwritten" style={{ fontSize: 24, color: 'var(--berry)' }}>questions, answered</div>
          <h2 className="display" style={{ fontSize: 54, margin: 0 }}>Before you ask</h2>
        </div>
        <div>
          {faqs.map((f, i) => (
            <div key={i} className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                style={{
                  width: '100%', padding: 22, textAlign: 'left', background: open === i ? 'var(--sun)' : 'var(--paper)',
                  border: 'none', cursor: 'pointer', fontFamily: 'Sniglet, sans-serif', fontWeight: 800, fontSize: 19,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                }}>
                <span>{f.q}</span>
                <span style={{ fontSize: 24, transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform .2s' }}>+</span>
              </button>
              {open === i && (
                <div style={{ padding: '0 22px 22px', fontSize: 16, color: 'var(--ink-soft)' }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
