'use client';

import { useEffect, useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

interface Product {
  id: string; title: string; priceCents: number; pages: number;
  age: string; theme: string; difficulty: string; color: string;
  accent: string; badge?: string; description: string;
  isActive: boolean; pdfStorageKey?: string;
}

const EMPTY: Omit<Product, 'isActive' | 'pdfStorageKey'> = {
  id: '', title: '', priceCents: 900, pages: 40,
  age: '5-8', theme: '', difficulty: 'Medium',
  color: '#FFC94A', accent: '#231F1A', badge: '', description: '',
};

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('jovie_token')}` };
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [uploading, setUploading] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch(`${API}/api/admin/products`, { headers: authHeader() });
    if (r.ok) setProducts(await r.json());
  }
  useEffect(() => { load(); }, []);

  function startEdit(p: Product) {
    setEditing(p);
    setForm({ id: p.id, title: p.title, priceCents: p.priceCents, pages: p.pages, age: p.age, theme: p.theme, difficulty: p.difficulty, color: p.color, accent: p.accent, badge: p.badge ?? '', description: p.description });
    setCreating(false);
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setForm({ ...EMPTY });
  }

  async function save() {
    if (creating) {
      const r = await fetch(`${API}/api/admin/products`, {
        method: 'POST', headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ageRange: form.age }),
      });
      if (r.ok) { setMsg('Product created'); setCreating(false); load(); }
      else setMsg((await r.json())?.message ?? 'Error');
    } else if (editing) {
      const r = await fetch(`${API}/api/admin/products/${editing.id}`, {
        method: 'PUT', headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ageRange: form.age, isActive: editing.isActive }),
      });
      if (r.ok) { setMsg('Saved'); setEditing(null); load(); }
      else setMsg('Error saving');
    }
  }

  async function toggleActive(p: Product) {
    await fetch(`${API}/api/admin/products/${p.id}`, {
      method: 'PUT', headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: p.title, priceCents: p.priceCents, pages: p.pages, ageRange: p.age, theme: p.theme, difficulty: p.difficulty, color: p.color, accent: p.accent, badge: p.badge, description: p.description, isActive: !p.isActive }),
    });
    load();
  }

  async function uploadPdf(productId: string, file: File) {
    setUploading(productId);
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${API}/api/admin/products/${productId}/pdf`, { method: 'POST', headers: authHeader(), body: fd });
    setUploading(null);
    if (r.ok) { setMsg('PDF uploaded'); load(); } else setMsg('PDF upload failed');
  }

  const panelOpen = creating || editing !== null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 42, margin: 0 }}>Products</h1>
        <button className="btn primary" onClick={startCreate}>+ New product</button>
      </div>

      {msg && <div style={{ background: 'var(--mint)', border: '1.5px solid var(--ink)', borderRadius: 8, padding: '8px 16px', marginBottom: 16, fontSize: 14 }}>{msg} <button onClick={() => setMsg('')} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}>✕</button></div>}

      <div style={{ display: 'grid', gridTemplateColumns: panelOpen ? '1fr 380px' : '1fr', gap: 24 }}>
        {/* Product table */}
        <div style={{ background: 'white', border: '2.5px solid var(--ink)', borderRadius: 20, overflow: 'hidden', boxShadow: '4px 4px 0 var(--ink)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
                {['ID', 'Title', 'Price', 'Pages', 'Status', 'PDF', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontFamily: 'Sniglet', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, opacity: 0.6 }}>{p.id}</td>
                  <td style={{ padding: '10px 14px' }}>{p.title}</td>
                  <td style={{ padding: '10px 14px' }}>${(p.priceCents / 100).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px' }}>{p.pages}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: p.isActive ? 'var(--mint)' : '#fee', border: '1.5px solid var(--ink)', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontFamily: 'Sniglet' }}>
                      {p.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <label style={{ cursor: 'pointer', fontSize: 12 }}>
                      {uploading === p.id ? 'Uploading…' : p.pdfStorageKey ? '✓ Replace' : '+ Upload'}
                      <input type="file" accept=".pdf" style={{ display: 'none' }}
                        onChange={e => e.target.files?.[0] && uploadPdf(p.id, e.target.files[0])} />
                    </label>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn sm ghost" onClick={() => startEdit(p)}>Edit</button>
                      <button className="btn sm ghost" onClick={() => toggleActive(p)} style={{ fontSize: 11 }}>
                        {p.isActive ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit / Create panel */}
        {panelOpen && (
          <div style={{ background: 'white', border: '2.5px solid var(--ink)', borderRadius: 20, padding: 24, boxShadow: '4px 4px 0 var(--ink)', alignSelf: 'start' }}>
            <h2 className="display" style={{ fontSize: 24, margin: '0 0 20px' }}>{creating ? 'New product' : `Edit ${editing?.id}`}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {creating && <Field label="ID (e.g. p13)" value={form.id} onChange={v => setForm(f => ({ ...f, id: v }))} />}
              <Field label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Price (cents)" type="number" value={String(form.priceCents)} onChange={v => setForm(f => ({ ...f, priceCents: parseInt(v) || 0 }))} />
                <Field label="Pages" type="number" value={String(form.pages)} onChange={v => setForm(f => ({ ...f, pages: parseInt(v) || 0 }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Age range" value={form.age} onChange={v => setForm(f => ({ ...f, age: v }))} placeholder="3-5, 5-8, 8-12" />
                <Field label="Theme" value={form.theme} onChange={v => setForm(f => ({ ...f, theme: v }))} />
              </div>
              <Field label="Difficulty" value={form.difficulty} onChange={v => setForm(f => ({ ...f, difficulty: v }))} placeholder="Easy, Medium, Hard" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Color (hex)" value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} />
                <Field label="Accent (hex)" value={form.accent} onChange={v => setForm(f => ({ ...f, accent: v }))} />
              </div>
              <Field label="Badge (optional)" value={form.badge ?? ''} onChange={v => setForm(f => ({ ...f, badge: v }))} placeholder="Bestseller, New" />
              <Field label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} multiline />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn primary" onClick={save}>Save</button>
                <button className="btn ghost" onClick={() => { setEditing(null); setCreating(false); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} />
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; multiline?: boolean;
}) {
  const style = {
    padding: '8px 12px', border: '2px solid var(--ink)', borderRadius: 8,
    fontFamily: 'inherit', fontSize: 14, background: 'var(--paper)', width: '100%',
    boxSizing: 'border-box' as const,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontFamily: 'Sniglet', fontSize: 11, fontWeight: 400 }}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{ ...style, resize: 'vertical' }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />}
    </div>
  );
}
