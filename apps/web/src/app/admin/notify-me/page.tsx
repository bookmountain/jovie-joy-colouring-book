"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { adminListNotifyMe, type AdminNotifyMeListItem } from "@/lib/adminApi";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminPagination } from "@/components/admin/ui/AdminPagination";
import { AdminTable, type AdminTableColumn } from "@/components/admin/ui/AdminTable";
import { AdminToolbar } from "@/components/admin/ui/AdminToolbar";

const PAGE_SIZE = 25;
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

const columns: AdminTableColumn<AdminNotifyMeListItem>[] = [
  { key: "email", label: "Email" },
  {
    key: "product",
    label: "Product",
    render: (row) => (
      <div>
        <div style={{ fontWeight: 800 }}>{row.productTitle || row.productSlug}</div>
        {row.productTitle ? (
          <div style={{ color: "var(--admin-muted)", fontFamily: "ui-monospace, monospace", fontSize: 10 }}>
            /{row.productSlug}
          </div>
        ) : null}
      </div>
    ),
  },
  {
    key: "createdAt",
    label: "Requested",
    render: (row) => dateFormatter.format(new Date(row.createdAt)),
  },
];

export default function NotifyMePage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminNotifyMeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminListNotifyMe(deferredSearch || undefined, page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [deferredSearch, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <AdminPageHeader crumb="Commerce" title="Notify me" subtitle={`${total} back-in-stock requests`} />
      <AdminToolbar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        placeholder="Search by email or product…"
      />
      {error ? <p role="alert" className="text-cocoa-coral">{error}</p> : null}
      {!error && !loading && items.length === 0 ? (
        <AdminEmptyState
          icon="🔔"
          heading={search ? "No matching requests" : "No requests yet"}
          body={search ? "Try another email or product." : "Back-in-stock requests will appear here."}
        />
      ) : null}
      {!error && (loading || items.length > 0) ? (
        <>
          <AdminTable columns={columns} rows={items} getRowKey={(row) => row.id} loading={loading} />
          {!loading ? (
            <AdminPagination
              page={page}
              totalPages={totalPages}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
