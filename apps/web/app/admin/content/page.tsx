'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

interface ContentItem { key: string; value: string; type: string; updatedAt: string }
type FieldDef = { key: string; label: string; type: 'text' | 'image'; multiline?: boolean };

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('jovie_token')}` };
}

const SECTIONS: { title: string; description?: string; keys: FieldDef[] }[] = [
  {
    title: 'Marquee bar',
    description: 'Scrolling text strip at the very top of every page.',
    keys: [
      { key: 'marquee.1', label: 'Item 1', type: 'text' },
      { key: 'marquee.2', label: 'Item 2', type: 'text' },
      { key: 'marquee.3', label: 'Item 3', type: 'text' },
      { key: 'marquee.4', label: 'Item 4', type: 'text' },
      { key: 'marquee.5', label: 'Item 5', type: 'text' },
    ],
  },
  {
    title: 'Home · Hero',
    keys: [
      { key: 'home.announcement', label: 'Announcement bar', type: 'text' },
      { key: 'home.hero.tagline', label: 'Hero tagline', type: 'text', multiline: true },
      { key: 'home.hero.subtext', label: 'Hero subtext', type: 'text', multiline: true },
    ],
  },
  {
    title: 'Home · How it works',
    keys: [
      { key: 'home.steps.1.title', label: 'Step 1 title', type: 'text' },
      { key: 'home.steps.1.desc', label: 'Step 1 description', type: 'text', multiline: true },
      { key: 'home.steps.2.title', label: 'Step 2 title', type: 'text' },
      { key: 'home.steps.2.desc', label: 'Step 2 description', type: 'text', multiline: true },
      { key: 'home.steps.3.title', label: 'Step 3 title', type: 'text' },
      { key: 'home.steps.3.desc', label: 'Step 3 description', type: 'text', multiline: true },
    ],
  },
  {
    title: 'Home · Testimonials',
    keys: [
      { key: 'home.testimonial.1.quote', label: 'Testimonial 1 quote', type: 'text', multiline: true },
      { key: 'home.testimonial.1.author', label: 'Testimonial 1 author', type: 'text' },
      { key: 'home.testimonial.2.quote', label: 'Testimonial 2 quote', type: 'text', multiline: true },
      { key: 'home.testimonial.2.author', label: 'Testimonial 2 author', type: 'text' },
      { key: 'home.testimonial.3.quote', label: 'Testimonial 3 quote', type: 'text', multiline: true },
      { key: 'home.testimonial.3.author', label: 'Testimonial 3 author', type: 'text' },
      { key: 'home.testimonial.4.quote', label: 'Testimonial 4 quote', type: 'text', multiline: true },
      { key: 'home.testimonial.4.author', label: 'Testimonial 4 author', type: 'text' },
    ],
  },
  {
    title: 'Home · Freebie section',
    keys: [
      { key: 'home.freebie.tagline', label: 'Tagline (small)', type: 'text' },
      { key: 'home.freebie.headline', label: 'Headline', type: 'text', multiline: true },
      { key: 'home.freebie.subtext', label: 'Subtext', type: 'text', multiline: true },
    ],
  },
  {
    title: 'About page',
    keys: [
      { key: 'about.headline', label: 'Headline', type: 'text' },
      { key: 'about.intro', label: 'Intro paragraph', type: 'text', multiline: true },
      { key: 'about.photo.1', label: 'Photo 1', type: 'image' },
      { key: 'about.photo.1.caption', label: 'Photo 1 caption', type: 'text' },
      { key: 'about.photo.2', label: 'Photo 2', type: 'image' },
      { key: 'about.photo.2.caption', label: 'Photo 2 caption', type: 'text' },
      { key: 'about.photo.3', label: 'Photo 3', type: 'image' },
      { key: 'about.photo.3.caption', label: 'Photo 3 caption', type: 'text' },
    ],
  },
  {
    title: 'About · Stats',
    keys: [
      { key: 'about.stat.1.n', label: 'Stat 1 number', type: 'text' },
      { key: 'about.stat.1.l', label: 'Stat 1 label', type: 'text' },
      { key: 'about.stat.2.n', label: 'Stat 2 number', type: 'text' },
      { key: 'about.stat.2.l', label: 'Stat 2 label', type: 'text' },
      { key: 'about.stat.3.n', label: 'Stat 3 number', type: 'text' },
      { key: 'about.stat.3.l', label: 'Stat 3 label', type: 'text' },
    ],
  },
  {
    title: 'About · Our promise',
    keys: [
      { key: 'about.promise.1.title', label: 'Promise 1 title', type: 'text' },
      { key: 'about.promise.1.desc', label: 'Promise 1 desc', type: 'text', multiline: true },
      { key: 'about.promise.2.title', label: 'Promise 2 title', type: 'text' },
      { key: 'about.promise.2.desc', label: 'Promise 2 desc', type: 'text', multiline: true },
      { key: 'about.promise.3.title', label: 'Promise 3 title', type: 'text' },
      { key: 'about.promise.3.desc', label: 'Promise 3 desc', type: 'text', multiline: true },
      { key: 'about.promise.4.title', label: 'Promise 4 title', type: 'text' },
      { key: 'about.promise.4.desc', label: 'Promise 4 desc', type: 'text', multiline: true },
    ],
  },
  {
    title: 'Freebie page',
    keys: [
      { key: 'freebie.tagline', label: 'Tagline (small)', type: 'text' },
      { key: 'freebie.headline', label: 'Headline', type: 'text', multiline: true },
      { key: 'freebie.subtext', label: 'Subtext', type: 'text', multiline: true },
    ],
  },
  {
    title: 'FAQ',
    keys: [
      { key: 'faq.1.q', label: 'Question 1', type: 'text' },
      { key: 'faq.1.a', label: 'Answer 1', type: 'text', multiline: true },
      { key: 'faq.2.q', label: 'Question 2', type: 'text' },
      { key: 'faq.2.a', label: 'Answer 2', type: 'text', multiline: true },
      { key: 'faq.3.q', label: 'Question 3', type: 'text' },
      { key: 'faq.3.a', label: 'Answer 3', type: 'text', multiline: true },
      { key: 'faq.4.q', label: 'Question 4', type: 'text' },
      { key: 'faq.4.a', label: 'Answer 4', type: 'text', multiline: true },
      { key: 'faq.5.q', label: 'Question 5', type: 'text' },
      { key: 'faq.5.a', label: 'Answer 5', type: 'text', multiline: true },
    ],
  },
];

export default function AdminContent() {
  const [content, setContent] = useState<Record<string, ContentItem>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ [SECTIONS[0].title]: true });

  async function load() {
    const r = await fetch(`${API}/api/content`);
    if (r.ok) {
      const items: ContentItem[] = await r.json();
      setContent(Object.fromEntries(items.map(i => [i.key, i])));
    }
  }
  useEffect(() => { load(); }, []);

  function getVal(key: string) {
    return editing[key] ?? content[key]?.value ?? '';
  }
  function dirty(key: string) {
    return editing[key] !== undefined && editing[key] !== (content[key]?.value ?? '');
  }

  async function saveText(key: string) {
    setSaving(key);
    const r = await fetch(`${API}/api/admin/content/${key}`, {
      method: 'PUT',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: getVal(key) }),
    });
    setSaving(null);
    if (r.ok) {
      setMsg({ text: `Saved ${key}`, type: 'success' });
      setEditing(e => { const n = { ...e }; delete n[key]; return n; });
      load();
    } else {
      setMsg({ text: 'Save failed', type: 'error' });
    }
  }

  async function uploadImage(key: string, file: File) {
    setSaving(key);
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${API}/api/admin/content/${key}/image`, {
      method: 'POST',
      headers: authHeader(),
      body: fd,
    });
    setSaving(null);
    if (r.ok) {
      setMsg({ text: `Image uploaded for ${key}`, type: 'success' });
      load();
    } else {
      setMsg({ text: 'Image upload failed', type: 'error' });
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1>Site content</h1>
        <p style={{ fontSize: 13, marginTop: 4 }}>
          Edit text and images shown on the public website. Each field saves independently.
        </p>
      </div>

      {msg && (
        <div className={`admin-toast ${msg.type === 'error' ? 'admin-toast-error' : ''}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SECTIONS.map(section => {
          const isOpen = !!open[section.title];
          return (
            <div key={section.title} className="admin-card">
              <button
                onClick={() => setOpen(o => ({ ...o, [section.title]: !o[section.title] }))}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isOpen ? '1px solid var(--a-border)' : 'none',
                  font: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'var(--a-ink)',
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{section.title}</div>
                  {section.description && (
                    <div style={{ fontSize: 12, color: 'var(--a-muted)', marginTop: 2 }}>{section.description}</div>
                  )}
                </div>
                <span style={{ color: 'var(--a-muted)' }}>{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div className="admin-card-body">
                  {section.keys.map(field => (
                    <div key={field.key} className="admin-field">
                      <label className="admin-label">
                        {field.label}
                        <span className="admin-label-hint admin-mono">{field.key}</span>
                      </label>

                      {field.type === 'image' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {content[field.key]?.value ? (
                            <img
                              src={content[field.key].value.startsWith('/uploads')
                                ? `${API}${content[field.key].value}`
                                : content[field.key].value}
                              alt={field.label}
                              style={{ width: 96, height: 72, objectFit: 'cover', border: '1px solid var(--a-border)', borderRadius: 6 }}
                            />
                          ) : (
                            <div style={{
                              width: 96, height: 72,
                              border: '1px dashed var(--a-border-strong)',
                              borderRadius: 6,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, color: 'var(--a-muted)',
                              background: 'var(--a-bg)',
                            }}>
                              No image
                            </div>
                          )}
                          <label className="admin-btn admin-btn-sm" style={{ cursor: 'pointer' }}>
                            {saving === field.key ? 'Uploading…' : content[field.key]?.value ? 'Replace' : 'Upload'}
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={e => e.target.files?.[0] && uploadImage(field.key, e.target.files[0])}
                            />
                          </label>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          {field.multiline ? (
                            <textarea
                              className="admin-textarea"
                              value={getVal(field.key)}
                              onChange={e => setEditing(ed => ({ ...ed, [field.key]: e.target.value }))}
                              rows={3}
                            />
                          ) : (
                            <input
                              className="admin-input"
                              type="text"
                              value={getVal(field.key)}
                              onChange={e => setEditing(ed => ({ ...ed, [field.key]: e.target.value }))}
                            />
                          )}
                          <button
                            className="admin-btn admin-btn-primary admin-btn-sm"
                            disabled={saving === field.key || !dirty(field.key)}
                            onClick={() => saveText(field.key)}
                          >
                            {saving === field.key ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      )}
                      {content[field.key] && (
                        <div style={{ fontSize: 11, color: 'var(--a-muted-2)', marginTop: 6 }}>
                          Last updated {new Date(content[field.key].updatedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
