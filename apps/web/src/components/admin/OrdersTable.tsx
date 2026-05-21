"use client";

import { Fragment, useEffect, useState } from "react";
import { adminListOrders, type AdminOrder } from "@/lib/adminApi";
import { formatCents } from "@/lib/format";
import { AdminButton, AdminSelect } from "@/components/admin/ui";

const STATUSES = ["", "pending", "paid", "failed", "refunded"];

export function OrdersTable() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: AdminOrder[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    adminListOrders(status || undefined, page, 20).then(setData).catch((e: Error) => setError(e.message));
  }, [status, page]);

  if (error) return <p className="text-cocoa-coral">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold">Status</label>
        <AdminSelect
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          value={status}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || "All"}
            </option>
          ))}
        </AdminSelect>
        <span className="ml-auto text-sm text-cocoa-text">{data.total} orders</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cocoa-line text-left text-cocoa-text">
            <th className="py-2">Created</th>
            <th className="py-2">Email</th>
            <th className="py-2">Status</th>
            <th className="py-2 text-right">Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.items.map((o) => (
            <Fragment key={o.id}>
              <tr className="border-b border-cocoa-line">
                <td className="py-2">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="py-2">{o.email}</td>
                <td className="py-2">{o.status}</td>
                <td className="py-2 text-right">{formatCents(o.totalCents)}</td>
                <td className="py-2 text-right">
                  <button
                    className="text-cocoa-purple underline"
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    type="button"
                  >
                    {expanded === o.id ? "Hide" : "Items"}
                  </button>
                </td>
              </tr>
              {expanded === o.id ? (
                <tr className="bg-cocoa-cream/50">
                  <td className="px-4 py-2" colSpan={5}>
                    <ul className="space-y-1 text-xs">
                      {o.items.map((i, idx) => (
                        <li key={idx}>
                          <code className="font-mono">{i.productSlug}</code> · {i.title} × {i.qty} · {formatCents(i.unitPriceCents)}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between">
        <AdminButton
          className="disabled:opacity-50"
          disabled={page === 1}
          onClick={() => setPage(Math.max(1, page - 1))}
          type="button"
          variant="ghost"
        >
          Prev
        </AdminButton>
        <span className="text-sm">
          Page {page} / {lastPage}
        </span>
        <AdminButton
          className="disabled:opacity-50"
          disabled={page === lastPage}
          onClick={() => setPage(Math.min(lastPage, page + 1))}
          type="button"
          variant="ghost"
        >
          Next
        </AdminButton>
      </div>
    </div>
  );
}
