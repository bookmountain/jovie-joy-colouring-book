"use client";

import { Fragment, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminListOrders, adminResendOrderDownloads, type AdminOrder } from "@/lib/adminApi";
import { formatCents } from "@/lib/format";
import { AdminButton, AdminSelect } from "@/components/admin/ui";

const STATUSES = ["", "pending", "paid", "failed", "refunded"];
const DELIVERY_LABELS: Record<AdminOrder["deliveryStatus"], string> = {
  not_applicable: "—",
  awaiting_payment: "Awaiting payment",
  payment_failed: "Payment failed",
  ready_to_send: "Ready to send",
  delivered: "Delivered",
  partially_expired: "Partially expired",
  expired: "Expired",
  revoked: "Revoked",
};

export function OrdersTable() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get("q") ?? "";
  const initialOrder = searchParams?.get("order") ?? null;
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: AdminOrder[]; total: number; pageSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(initialOrder);
  const [resending, setResending] = useState<string | null>(null);
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  useEffect(() => {
    setSearch(initialSearch);
    setDebouncedSearch(initialSearch);
    setExpanded(initialOrder);
    setPage(1);
  }, [initialOrder, initialSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    adminListOrders(status || undefined, page, 20, debouncedSearch || undefined)
      .then((response) => { if (!cancelled) setData(response); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [status, page, debouncedSearch]);

  async function resendDownloads(order: AdminOrder) {
    setResending(order.id);
    setDeliveryMessage(null);
    setDeliveryError(null);
    try {
      const result = await adminResendOrderDownloads(order.id);
      setData((current) => current ? {
        ...current,
        items: current.items.map((item) => item.id === order.id ? {
          ...item,
          downloadEmailSentAt: result.downloadEmailSentAt,
          downloadGrantCount: result.grantCount,
          activeDownloadGrantCount: result.activeGrantCount,
          expiredDownloadGrantCount: result.expiredGrantCount,
          deliveryStatus: result.activeGrantCount > 0 ? "delivered" : "expired",
        } : item),
      } : current);
      setDeliveryMessage(
        result.regeneratedExpiredLinks
          ? `Fresh download links were emailed to ${order.email}.`
          : `Download links were emailed to ${order.email}.`,
      );
    } catch (reason) {
      setDeliveryError(reason instanceof Error ? reason.message : "Could not send download links");
    } finally {
      setResending(null);
    }
  }

  if (error) return <p className="text-cocoa-coral">{error}</p>;
  if (!data) return <p>Loading…</p>;

  const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold" htmlFor="orders-search">Search</label>
        <input
          className="admin-input"
          id="orders-search"
          onChange={(event) => { setPage(1); setSearch(event.target.value); }}
          placeholder="Email, name, or full order id…"
          style={{ maxWidth: 280 }}
          value={search}
        />
        <label className="text-sm font-semibold" htmlFor="orders-status">Status</label>
        <AdminSelect
          id="orders-status"
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
      {deliveryMessage ? <p className="text-sm text-green-700" role="status">{deliveryMessage}</p> : null}
      {deliveryError ? <p className="text-sm text-cocoa-coral" role="alert">{deliveryError}</p> : null}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cocoa-line text-left text-cocoa-text">
            <th className="py-2">Created</th>
            <th className="py-2">Email</th>
            <th className="py-2">Status</th>
            <th className="py-2">Delivery</th>
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
                <td className="py-2">{DELIVERY_LABELS[o.deliveryStatus]}</td>
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
                  <td className="space-y-3 px-4 py-3" colSpan={6}>
                    <ul className="space-y-1 text-xs">
                      {o.items.map((i, idx) => (
                        <li key={idx}>
                          <code className="font-mono">{i.productSlug}</code> · {i.title} × {i.qty} · {formatCents(i.unitPriceCents)}
                        </li>
                      ))}
                    </ul>
                    {o.digitalItemCount > 0 ? (
                      <div className="flex flex-wrap items-center gap-3 border-t border-cocoa-line pt-3 text-xs">
                        <span>
                          Downloads: {o.activeDownloadGrantCount} active · {o.expiredDownloadGrantCount} expired
                          {o.downloadEmailSentAt ? ` · emailed ${new Date(o.downloadEmailSentAt).toLocaleString()}` : " · not emailed"}
                        </span>
                        {o.status.toLowerCase() === "paid" ? (
                          <AdminButton
                            disabled={resending === o.id}
                            onClick={() => void resendDownloads(o)}
                            size="sm"
                            variant="ghost"
                          >
                            {resending === o.id
                              ? "Sending…"
                              : o.deliveryStatus === "ready_to_send"
                                ? "Send downloads"
                                : o.deliveryStatus === "expired" || o.deliveryStatus === "partially_expired"
                                  ? "Regenerate & send"
                                  : "Resend downloads"}
                          </AdminButton>
                        ) : null}
                      </div>
                    ) : null}
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
