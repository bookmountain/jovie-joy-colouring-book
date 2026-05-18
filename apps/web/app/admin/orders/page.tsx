'use client';

import React, { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

interface Order {
  id: string; email: string; name?: string; status: string;
  totalCents: number; discountCents: number; currency: string;
  createdAt: string; paidAt?: string;
  items: { productId: string; title: string; unitPriceCents: number; quantity: number }[];
}

interface OrdersResponse { total: number; page: number; pageSize: number; items: Order[] }

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('jovie_token')}` };
}

const STATUS_BADGE: Record<string, string> = {
  Paid: 'admin-badge-success',
  Pending: 'admin-badge-warning',
  Failed: 'admin-badge-danger',
  Refunded: 'admin-badge-info',
};

const FILTERS = ['', 'Paid', 'Pending', 'Failed', 'Refunded'] as const;

export default function AdminOrders() {
  const [data, setData] = useState<OrdersResponse | null>(null);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>Orders</h1>
        <div className="admin-filter-group">
          {FILTERS.map(s => (
            <button
              key={s}
              className={`admin-filter-chip ${status === s ? 'active' : ''}`}
              onClick={() => { setStatus(s); setPage(1); }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <>
          <div style={{ fontSize: 13, color: 'var(--a-muted)', marginBottom: 12 }}>
            {data.total} order{data.total !== 1 ? 's' : ''}
          </div>
          <div className="admin-card" style={{ overflow: 'hidden' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Date</th>
                  <th>Customer</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 110 }}>Total</th>
                  <th style={{ width: 80 }}>Items</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(o => (
                  <React.Fragment key={o.id}>
                    <tr
                      className="admin-row-clickable"
                      onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    >
                      <td style={{ color: 'var(--a-muted)' }}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{o.name ?? '—'}</div>
                        <div className="admin-mono">{o.email}</div>
                      </td>
                      <td>
                        <span className={`admin-badge ${STATUS_BADGE[o.status] ?? 'admin-badge-neutral'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td>
                        ${(o.totalCents / 100).toFixed(2)}
                        {o.discountCents > 0 && (
                          <span style={{ fontSize: 12, color: 'var(--a-muted)', marginLeft: 4 }}>
                            (−${(o.discountCents / 100).toFixed(2)})
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--a-muted)' }}>
                        {o.items.length}
                      </td>
                      <td style={{ color: 'var(--a-muted)' }}>
                        {expanded === o.id ? '▾' : '▸'}
                      </td>
                    </tr>
                    {expanded === o.id && (
                      <tr className="admin-detail-row">
                        <td colSpan={6}>
                          <div style={{ fontSize: 13 }}>
                            <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--a-ink)' }}>Line items</div>
                            {o.items.map(item => (
                              <div
                                key={item.productId}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '6px 0',
                                  borderBottom: '1px solid var(--a-border)',
                                }}
                              >
                                <span>{item.title}</span>
                                <span style={{ color: 'var(--a-muted)' }}>
                                  ×{item.quantity} · ${(item.unitPriceCents / 100).toFixed(2)} ea
                                </span>
                              </div>
                            ))}
                            <div className="admin-mono" style={{ marginTop: 10 }}>Order ID: {o.id}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--a-muted)', padding: '32px 16px' }}>
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center', alignItems: 'center' }}>
              <button className="admin-btn admin-btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                ← Previous
              </button>
              <span style={{ fontSize: 13, color: 'var(--a-muted)', padding: '0 12px' }}>
                Page {page} of {totalPages}
              </span>
              <button className="admin-btn admin-btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
