'use client';

import { useEffect, useState } from 'react';

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

function fmtPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [uploading, setUploading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

  function cancel() {
    setCreating(false);
    setEditing(null);
  }

  async function save() {
    if (creating) {
      const r = await fetch(`${API}/api/admin/products`, {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ageRange: form.age }),
      });
      if (r.ok) {
        setMsg({ text: 'Product created', type: 'success' });
        setCreating(false);
        load();
      } else {
        const err = await r.json().catch(() => ({}));
        setMsg({ text: err?.message ?? 'Could not create product', type: 'error' });
      }
    } else if (editing) {
      const r = await fetch(`${API}/api/admin/products/${editing.id}`, {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ageRange: form.age, isActive: editing.isActive }),
      });
      if (r.ok) {
        setMsg({ text: 'Saved', type: 'success' });
        setEditing(null);
        load();
      } else {
        setMsg({ text: 'Could not save changes', type: 'error' });
      }
    }
  }

  async function toggleActive(p: Product) {
    await fetch(`${API}/api/admin/products/${p.id}`, {
      method: 'PUT',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: p.title, priceCents: p.priceCents, pages: p.pages, ageRange: p.age,
        theme: p.theme, difficulty: p.difficulty, color: p.color, accent: p.accent,
        badge: p.badge, description: p.description, isActive: !p.isActive,
      }),
    });
    load();
  }

  async function uploadPdf(productId: string, file: File) {
    setUploading(productId);
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${API}/api/admin/products/${productId}/pdf`, {
      method: 'POST',
      headers: authHeader(),
      body: fd,
    });
    setUploading(null);
    if (r.ok) {
      setMsg({ text: 'PDF uploaded', type: 'success' });
      load();
    } else {
      setMsg({ text: 'PDF upload failed', type: 'error' });
    }
  }

  const panelOpen = creating || editing !== null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>Products</h1>
        <button className="admin-btn admin-btn-primary" onClick={startCreate}>+ New product</button>
      </div>

      {msg && (
        <div className={`admin-toast ${msg.type === 'error' ? 'admin-toast-error' : ''}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: panelOpen ? '1fr 400px' : '1fr', gap: 20, alignItems: 'start' }}>
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ width: 80 }}>Price</th>
                <th style={{ width: 70 }}>Pages</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 130 }}>PDF</th>
                <th style={{ width: 150 }}></th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.title}</div>
                    <div className="admin-mono">{p.id}</div>
                  </td>
                  <td>{fmtPrice(p.priceCents)}</td>
                  <td>{p.pages}</td>
                  <td>
                    <span className={`admin-badge ${p.isActive ? 'admin-badge-success' : 'admin-badge-neutral'}`}>
                      {p.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <label style={{ cursor: 'pointer', fontSize: 13, color: p.pdfStorageKey ? 'var(--a-success)' : 'var(--a-accent)' }}>
                      {uploading === p.id ? 'Uploading…' : p.pdfStorageKey ? '✓ Replace' : '+ Upload'}
                      <input
                        type="file"
                        accept=".pdf"
                        style={{ display: 'none' }}
                        onChange={e => e.target.files?.[0] && uploadPdf(p.id, e.target.files[0])}
                      />
                    </label>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="admin-btn admin-btn-sm" onClick={() => startEdit(p)}>Edit</button>
                    <button className="admin-btn admin-btn-sm" onClick={() => toggleActive(p)} style={{ marginLeft: 6 }}>
                      {p.isActive ? 'Hide' : 'Show'}
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--a-muted)', padding: '24px 16px' }}>
                    No products yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {panelOpen && (
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>{creating ? 'New product' : `Edit ${editing?.id}`}</h2>
              <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={cancel}>Close ✕</button>
            </div>
            <div className="admin-card-body">
              {creating && (
                <Field label="ID" hint="e.g. p13" value={form.id} onChange={v => setForm(f => ({ ...f, id: v }))} />
              )}
              <Field label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Price (cents)" type="number" value={String(form.priceCents)} onChange={v => setForm(f => ({ ...f, priceCents: parseInt(v) || 0 }))} />
                <Field label="Pages" type="number" value={String(form.pages)} onChange={v => setForm(f => ({ ...f, pages: parseInt(v) || 0 }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Age range" value={form.age} onChange={v => setForm(f => ({ ...f, age: v }))} hint="3-5, 5-8, 8-12" />
                <Field label="Theme" value={form.theme} onChange={v => setForm(f => ({ ...f, theme: v }))} />
              </div>
              <Field label="Difficulty" value={form.difficulty} onChange={v => setForm(f => ({ ...f, difficulty: v }))} hint="Easy, Medium, Hard" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Color (hex)" value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} />
                <Field label="Accent (hex)" value={form.accent} onChange={v => setForm(f => ({ ...f, accent: v }))} />
              </div>
              <Field label="Badge" hint="Bestseller, New (optional)" value={form.badge ?? ''} onChange={v => setForm(f => ({ ...f, badge: v }))} />
              <Field label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} multiline />
              <div style={{ display: 'flex', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--a-border)' }}>
                <button className="admin-btn admin-btn-primary" onClick={save}>Save</button>
                <button className="admin-btn" onClick={cancel}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, hint, value, onChange, type = 'text', multiline }: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <div className="admin-field">
      <label className="admin-label">
        {label}
        {hint && <span className="admin-label-hint">{hint}</span>}
      </label>
      {multiline ? (
        <textarea
          className="admin-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          className="admin-input"
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
