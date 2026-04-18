'use client';

import React, { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

interface Order {
  id: string; email: string; name?: string; status: string;
  totalCents: number; discountCents: number; currency: string;
  createdAt: string; paidAt?: string;
  items: { productId: string; title: string; unitPriceCents: number; quantity: number }[];
}

interface Response { total: number; page: number; pageSize: number; items: Order[] }

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('jovie_token')}` };
}

const STATUS_COLOR: Record<string, string> = {
  Paid: 'var(--mint)', Pending: 'var(--sun)', Failed: '#fee', Refunded: 'var(--sky)',
};

export default function AdminOrders() {
  const [data, setData] = useState<Response | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load(p = page, s = status) {
    const qs = new URLSearchParams({ page: String(p), pageSize: '20', ...(s ? { status: s } : {}) });
    const r = await fetch(`${API}/api/admin/orders?${qs}`, { headers: authHeader() });
    if (r.ok) setData(await r.json());
  }

  useEffect(() => { load(); }, [page, status]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 42, margin: 0 }}>Orders</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'Paid', 'Pending', 'Failed', 'Refunded'].map(s => (
            <button key={s} className={`btn sm ${status === s ? 'primary' : 'ghost'}`}
              onClick={() => { setStatus(s); setPage(1); }}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>
            {data.total} order{data.total !== 1 ? 's' : ''}
          </div>
          <div style={{ background: 'white', border: '2.5px solid var(--ink)', borderRadius: 20, overflow: 'hidden', boxShadow: '4px 4px 0 var(--ink)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
                  {['Date', 'Customer', 'Status', 'Total', 'Items', ''].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontFamily: 'Sniglet', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((o, i) => (
                  <React.Fragment key={o.id}>
                    <tr style={{ borderBottom: expanded === o.id ? 'none' : '1px solid rgba(0,0,0,0.07)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)', cursor: 'pointer' }}
                      onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                      <td style={{ padding: '10px 14px', fontSize: 12, opacity: 0.7 }}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div>{o.name ?? '—'}</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>{o.email}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: STATUS_COLOR[o.status] ?? '#eee', border: '1.5px solid var(--ink)', borderRadius: 999, padding: '2px 10px', fontSize: 11, fontFamily: 'Sniglet' }}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'Sniglet', fontWeight: 800 }}>
                        ${(o.totalCents / 100).toFixed(2)}
                        {o.discountCents > 0 && <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>(-${(o.discountCents / 100).toFixed(2)})</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, opacity: 0.7 }}>{o.items.length} item{o.items.length !== 1 ? 's' : ''}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>{expanded === o.id ? '▲' : '▼'}</td>
                    </tr>
                    {expanded === o.id && (
                      <tr key={`${o.id}-detail`} style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                        <td colSpan={6} style={{ padding: '0 14px 16px 14px' }}>
                          <div style={{ background: 'var(--cream-2)', borderRadius: 10, padding: '12px 16px', fontSize: 13 }}>
                            <div style={{ fontFamily: 'Sniglet', fontWeight: 800, marginBottom: 8 }}>Order items</div>
                            {o.items.map(item => (
                              <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                <span>{item.title}</span>
                                <span style={{ opacity: 0.7 }}>×{item.quantity} · ${(item.unitPriceCents / 100).toFixed(2)} ea</span>
                              </div>
                            ))}
                            <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 11, opacity: 0.5 }}>ID: {o.id}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {data.items.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-soft)' }}>No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
              <button className="btn sm ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ fontFamily: 'Sniglet', fontSize: 13, padding: '8px 12px' }}>{page} / {totalPages}</span>
              <button className="btn sm ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
