'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

interface ContentItem { key: string; value: string; type: string; updatedAt: string }

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('jovie_token')}` };
}

const SECTIONS = [
  {
    title: 'Home page',
    keys: [
      { key: 'home.announcement', label: 'Announcement bar', type: 'text' },
      { key: 'home.hero.tagline', label: 'Hero tagline', type: 'text' },
      { key: 'home.hero.subtext', label: 'Hero subtext', type: 'text', multiline: true },
    ],
  },
  {
    title: 'About page',
    keys: [
      { key: 'about.headline', label: 'Headline', type: 'text' },
      { key: 'about.intro', label: 'Intro paragraph', type: 'text', multiline: true },
      { key: 'about.photo.1', label: 'Photo 1', type: 'image' },
      { key: 'about.photo.2', label: 'Photo 2', type: 'image' },
      { key: 'about.photo.3', label: 'Photo 3', type: 'image' },
    ],
  },
];

export default function AdminContent() {
  const [content, setContent] = useState<Record<string, ContentItem>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

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

  async function saveText(key: string) {
    setSaving(key);
    const r = await fetch(`${API}/api/admin/content/${key}`, {
      method: 'PUT',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: getVal(key) }),
    });
    setSaving(null);
    if (r.ok) {
      setMsg(`Saved: ${key}`);
      setEditing(e => { const n = { ...e }; delete n[key]; return n; });
      load();
    } else setMsg('Save failed');
  }

  async function uploadImage(key: string, file: File) {
    setSaving(key);
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${API}/api/admin/content/${key}/image`, {
      method: 'POST', headers: authHeader(), body: fd,
    });
    setSaving(null);
    if (r.ok) { setMsg(`Image uploaded: ${key}`); load(); }
    else setMsg('Upload failed');
  }

  return (
    <div>
      <h1 className="display" style={{ fontSize: 42, margin: '0 0 8px' }}>Site Content</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 32 }}>
        Edit text and upload images for the public website.
      </p>

      {msg && (
        <div style={{ background: 'var(--mint)', border: '1.5px solid var(--ink)', borderRadius: 8, padding: '8px 16px', marginBottom: 24, fontSize: 14 }}>
          {msg} <button onClick={() => setMsg('')} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {SECTIONS.map(section => (
          <div key={section.title} style={{ background: 'white', border: '2.5px solid var(--ink)', borderRadius: 20, padding: 28, boxShadow: '4px 4px 0 var(--ink)' }}>
            <h2 className="display" style={{ fontSize: 24, margin: '0 0 20px' }}>{section.title}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {section.keys.map(field => (
                <div key={field.key}>
                  <label style={{ fontFamily: 'Sniglet', fontSize: 13, fontWeight: 800, display: 'block', marginBottom: 6 }}>
                    {field.label}
                    <span style={{ marginLeft: 8, opacity: 0.4, fontSize: 11, fontWeight: 400 }}>{field.key}</span>
                  </label>

                  {field.type === 'image' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {content[field.key]?.value ? (
                        <img
                          src={content[field.key].value.startsWith('/uploads')
                            ? `${API}${content[field.key].value}`
                            : content[field.key].value}
                          alt={field.label}
                          style={{ width: 100, height: 75, objectFit: 'cover', border: '2px solid var(--ink)', borderRadius: 8 }}
                        />
                      ) : (
                        <div style={{ width: 100, height: 75, border: '2px dashed var(--ink)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--ink-soft)' }}>
                          No image
                        </div>
                      )}
                      <label className="btn sm ghost" style={{ cursor: 'pointer' }}>
                        {saving === field.key ? 'Uploading…' : 'Upload image'}
                        <input type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={e => e.target.files?.[0] && uploadImage(field.key, e.target.files[0])} />
                      </label>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      {field.multiline ? (
                        <textarea
                          value={getVal(field.key)}
                          onChange={e => setEditing(ed => ({ ...ed, [field.key]: e.target.value }))}
                          rows={3}
                          style={{ flex: 1, padding: '8px 12px', border: '2px solid var(--ink)', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={getVal(field.key)}
                          onChange={e => setEditing(ed => ({ ...ed, [field.key]: e.target.value }))}
                          style={{ flex: 1, padding: '8px 12px', border: '2px solid var(--ink)', borderRadius: 8, fontFamily: 'inherit', fontSize: 14 }}
                        />
                      )}
                      <button
                        className="btn sm primary"
                        disabled={saving === field.key || getVal(field.key) === (content[field.key]?.value ?? '')}
                        onClick={() => saveText(field.key)}
                      >
                        {saving === field.key ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  )}
                  {content[field.key] && (
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                      Last updated {new Date(content[field.key].updatedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
