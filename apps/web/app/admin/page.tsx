'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

interface Analytics {
  totalOrders: number;
  paidOrders: number;
  totalRevenueCents: number;
  revenueThisMonthCents: number;
  ordersThisMonth: number;
  last30Days: { date: string; revenueCents: number; orders: number }[];
  topProducts: { productId: string; title: string; unitsSold: number; revenueCents: number }[];
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('jovie_token');
    fetch(`${API}/api/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setError('Could not load analytics.'));
  }, []);

  const maxRevenue = data ? Math.max(...data.last30Days.map(d => d.revenueCents), 1) : 1;
  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <h1>Overview</h1>
        <span style={{ color: 'var(--a-muted)', fontSize: 13 }}>{today}</span>
      </div>

      {error && (
        <div className="admin-toast admin-toast-error">
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total revenue', value: fmt(data.totalRevenueCents) },
              { label: 'Revenue this month', value: fmt(data.revenueThisMonthCents) },
              { label: 'Paid orders', value: data.paidOrders.toString() },
              { label: 'Orders this month', value: data.ordersThisMonth.toString() },
            ].map(s => (
              <div key={s.label} className="admin-kpi">
                <div className="admin-kpi-label">{s.label}</div>
                <div className="admin-kpi-value">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="admin-card" style={{ marginBottom: 24 }}>
            <div className="admin-card-header">
              <h2>Revenue — last 30 days</h2>
              <span style={{ fontSize: 12, color: 'var(--a-muted)' }}>
                {data.last30Days[0]?.date} → {data.last30Days[data.last30Days.length - 1]?.date}
              </span>
            </div>
            <div className="admin-card-body">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, paddingTop: 8 }}>
                {data.last30Days.map(d => {
                  const height = d.revenueCents > 0
                    ? Math.max((d.revenueCents / maxRevenue) * 100, 6)
                    : 1;
                  return (
                    <div
                      key={d.date}
                      title={`${d.date}: ${fmt(d.revenueCents)} (${d.orders} orders)`}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}
                    >
                      <div
                        className="admin-bar"
                        style={{
                          height: `${height}%`,
                          background: d.revenueCents > 0 ? 'var(--a-accent)' : 'var(--a-border)',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h2>Top products</h2>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ width: 140 }}>Units sold</th>
                  <th style={{ width: 160 }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map(p => (
                  <tr key={p.productId}>
                    <td>{p.title}</td>
                    <td>{p.unitsSold}</td>
                    <td>{fmt(p.revenueCents)}</td>
                  </tr>
                ))}
                {data.topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--a-muted)', padding: '24px 16px' }}>
                      No sales yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
