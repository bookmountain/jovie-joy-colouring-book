'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError('Invalid credentials. Check email and password.');
        return;
      }
      const data = await res.json();
      localStorage.setItem('jovie_token', data.token);
      router.push('/admin');
    } catch {
      setError('Could not reach the server. Is the API running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ink)', padding: 24,
    }}>
      <div style={{
        background: 'var(--cream)', border: '2.5px solid var(--ink)', borderRadius: 24,
        padding: '48px 40px', width: '100%', maxWidth: 400,
        boxShadow: '8px 8px 0 0 var(--sun)',
      }}>
        <div className="handwritten" style={{ fontSize: 22, color: 'var(--tomato)', marginBottom: -4 }}>
          admin only
        </div>
        <h1 className="display" style={{ fontSize: 48, margin: '0 0 32px' }}>Dashboard</h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'Sniglet', fontSize: 13, fontWeight: 800 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus
              style={{
                padding: '10px 14px', border: '2px solid var(--ink)', borderRadius: 10,
                fontFamily: 'inherit', fontSize: 15, background: 'var(--paper)',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: 'Sniglet', fontSize: 13, fontWeight: 800 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required
              style={{
                padding: '10px 14px', border: '2px solid var(--ink)', borderRadius: 10,
                fontFamily: 'inherit', fontSize: 15, background: 'var(--paper)',
              }}
            />
          </div>
          {error && (
            <div style={{ background: '#fee', border: '1.5px solid var(--tomato)', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: 'var(--tomato)' }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn primary lg" style={{ marginTop: 8 }}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>
      </div>
    </div>
  );
}
