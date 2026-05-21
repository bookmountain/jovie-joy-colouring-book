"use client";

import { useEffect, useState } from "react";
import { adminAnalyticsSummary } from "@/lib/adminApi";
import { formatCents } from "@/lib/format";
import { AdminPanel } from "@/components/admin/ui";

type Summary = Awaited<ReturnType<typeof adminAnalyticsSummary>>;

export function AnalyticsCards() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminAnalyticsSummary().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-cocoa-coral">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const cards = [
    { label: "Revenue (all-time)", value: formatCents(data.totalRevenueCents) },
    { label: "Revenue (this month)", value: formatCents(data.revenueThisMonthCents) },
    { label: "Orders (this month)", value: String(data.ordersThisMonth) },
    { label: "Paid orders", value: String(data.paidOrders) },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <AdminPanel className="p-5" key={c.label}>
            <div className="text-sm text-cocoa-text">{c.label}</div>
            <div className="mt-1 text-2xl font-extrabold text-cocoa-ink">{c.value}</div>
          </AdminPanel>
        ))}
      </div>

      <AdminPanel className="p-6">
        <h2 className="mb-4 text-lg font-bold">Last 30 days</h2>
        {data.last30Days.length === 0 ? (
          <p className="text-cocoa-text">No paid orders in the last 30 days.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-cocoa-text">
                <th className="py-2">Date</th>
                <th className="py-2">Orders</th>
                <th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.last30Days.map((d) => (
                <tr className="border-t border-cocoa-line" key={d.date}>
                  <td className="py-2">{d.date}</td>
                  <td className="py-2">{d.orders}</td>
                  <td className="py-2 text-right">{formatCents(d.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminPanel>

      <AdminPanel className="p-6">
        <h2 className="mb-4 text-lg font-bold">Top products</h2>
        {data.topProducts.length === 0 ? (
          <p className="text-cocoa-text">No sales yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-cocoa-text">
                <th className="py-2">Title</th>
                <th className="py-2">Units</th>
                <th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p) => (
                <tr className="border-t border-cocoa-line" key={p.productSlug}>
                  <td className="py-2">{p.title}</td>
                  <td className="py-2">{p.unitsSold}</td>
                  <td className="py-2 text-right">{formatCents(p.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminPanel>
    </div>
  );
}
