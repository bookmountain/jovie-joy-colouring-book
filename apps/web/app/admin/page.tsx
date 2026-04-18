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

  return (
    <div>
      <h1 className="display" style={{ fontSize: 42, margin: '0 0 8px' }}>Overview</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 32 }}>
        {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {error && <div style={{ color: 'var(--tomato)', marginBottom: 24 }}>{error}</div>}

      {data && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Total revenue', value: fmt(data.totalRevenueCents), color: 'var(--sun)' },
              { label: 'This month', value: fmt(data.revenueThisMonthCents), color: 'var(--mint)' },
              { label: 'Paid orders', value: data.paidOrders.toString(), color: 'var(--sky)' },
              { label: 'Orders this month', value: data.ordersThisMonth.toString(), color: 'var(--berry)' },
            ].map(s => (
              <div key={s.label} style={{
                background: s.color, border: '2.5px solid var(--ink)', borderRadius: 16,
                padding: '20px 24px', boxShadow: '4px 4px 0 var(--ink)',
              }}>
                <div style={{ fontSize: 12, fontFamily: 'Sniglet', fontWeight: 800, opacity: 0.7, marginBottom: 6 }}>{s.label}</div>
                <div className="display" style={{ fontSize: 32 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          <div style={{
            background: 'white', border: '2.5px solid var(--ink)', borderRadius: 20,
            padding: 28, marginBottom: 24, boxShadow: '4px 4px 0 var(--ink)',
          }}>
            <h2 className="display" style={{ fontSize: 22, margin: '0 0 20px' }}>Revenue — last 30 days</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
              {data.last30Days.map(d => (
                <div key={d.date} title={`${d.date}: ${fmt(d.revenueCents)} (${d.orders} orders)`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{
                    width: '100%', background: d.revenueCents > 0 ? 'var(--tomato)' : 'rgba(0,0,0,0.07)',
                    border: d.revenueCents > 0 ? '1.5px solid var(--ink)' : 'none',
                    borderRadius: '4px 4px 0 0',
                    height: `${Math.max((d.revenueCents / maxRevenue) * 100, d.revenueCents > 0 ? 8 : 2)}%`,
                  }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'Sniglet' }}>
              <span>{data.last30Days[0]?.date}</span>
              <span>{data.last30Days[data.last30Days.length - 1]?.date}</span>
            </div>
          </div>

          {/* Top products */}
          <div style={{
            background: 'white', border: '2.5px solid var(--ink)', borderRadius: 20,
            padding: 28, boxShadow: '4px 4px 0 var(--ink)',
          }}>
            <h2 className="display" style={{ fontSize: 22, margin: '0 0 16px' }}>Top products</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--ink)' }}>
                  {['Product', 'Units sold', 'Revenue'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 12px', fontFamily: 'Sniglet', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((p, i) => (
                  <tr key={p.productId} style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                    <td style={{ padding: '10px 12px' }}>{p.title}</td>
                    <td style={{ padding: '10px 12px' }}>{p.unitsSold}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'Sniglet', fontWeight: 800 }}>{fmt(p.revenueCents)}</td>
                  </tr>
                ))}
                {data.topProducts.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: '20px 12px', color: 'var(--ink-soft)', textAlign: 'center' }}>No sales yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
