"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminListCustomers, type AdminCustomerListItem } from "@/lib/adminApi";
import { formatCents } from "@/lib/format";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminPagination } from "@/components/admin/ui/AdminPagination";
import { AdminTable, type AdminTableColumn } from "@/components/admin/ui/AdminTable";
import { AdminToolbar } from "@/components/admin/ui/AdminToolbar";

const PAGE_SIZE = 25;
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : "Never";
}

const columns: AdminTableColumn<AdminCustomerListItem>[] = [
  {
    key: "customer",
    label: "Customer",
    render: (row) => (
      <div>
        <div style={{ fontWeight: 800 }}>{row.name || "Guest customer"}</div>
        <div style={{ color: "var(--admin-muted)", fontSize: 11 }}>{row.email}</div>
      </div>
    ),
  },
  {
    key: "account",
    label: "Account",
    render: (row) => (
      <AdminBadge variant={row.registered ? "pub" : "neutral"}>
        {row.registered ? "Registered" : "Guest"}
      </AdminBadge>
    ),
  },
  { key: "orderCount", label: "Orders" },
  {
    key: "lifetimeSpendCents",
    label: "Lifetime paid",
    render: (row) => formatCents(row.lifetimeSpendCents),
  },
  {
    key: "lastOrderAt",
    label: "Last order",
    render: (row) => formatDate(row.lastOrderAt),
  },
  {
    key: "joinedAt",
    label: "Joined",
    render: (row) => formatDate(row.joinedAt),
  },
];

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const searchParamQuery = searchParams?.get("q") ?? "";
  const [search, setSearch] = useState(searchParamQuery);
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminCustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearch(searchParamQuery);
    setPage(1);
  }, [searchParamQuery]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminListCustomers(deferredSearch || undefined, page, PAGE_SIZE)
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
      <AdminPageHeader
        crumb="Commerce"
        title="Customers"
        subtitle={`${total} customer records · registered accounts and guest purchasers · lifetime value includes paid orders`}
      />
      <AdminToolbar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        placeholder="Search customers by name or email…"
      />
      {error ? <p role="alert" className="text-cocoa-coral">{error}</p> : null}
      {!error && !loading && items.length === 0 ? (
        <AdminEmptyState
          icon="👥"
          heading={search ? "No matching customers" : "No customers yet"}
          body={search ? "Try another name or email address." : "Registered accounts and guest purchasers will appear here."}
        />
      ) : null}
      {!error && (loading || items.length > 0) ? (
        <>
          <AdminTable columns={columns} rows={items} getRowKey={(row) => row.email} loading={loading} />
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
