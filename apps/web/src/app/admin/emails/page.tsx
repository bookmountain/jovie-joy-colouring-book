"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminListEmailCampaigns,
  type EmailCampaignListItem,
  type EmailCampaignStatus,
} from "@/lib/adminApi";
import {
  AdminBadge,
  AdminEmptyState,
  AdminFilterChip,
  AdminPageHeader,
  AdminTable,
  type AdminBadgeVariant,
  type AdminTableColumn,
} from "@/components/admin/ui";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

const STATUS: Record<EmailCampaignStatus, { label: string; variant: AdminBadgeVariant }> = {
  Draft: { label: "To review", variant: "draft" },
  Sending: { label: "Sending", variant: "scheduled" },
  Sent: { label: "Sent", variant: "pub" },
  Skipped: { label: "Skipped", variant: "neutral" },
};

const TABS: Array<{ key: string; label: string; statuses: EmailCampaignStatus[] }> = [
  { key: "review", label: "To review", statuses: ["Draft"] },
  { key: "sent", label: "Sent", statuses: ["Sending", "Sent"] },
  { key: "skipped", label: "Skipped", statuses: ["Skipped"] },
];

const columns: AdminTableColumn<EmailCampaignListItem>[] = [
  {
    key: "itemTitle",
    label: "New item",
    render: (row) => `${row.kind === "Freebie" ? "🎁" : "📦"} ${row.itemTitle}`,
  },
  { key: "subject", label: "Subject" },
  {
    key: "status",
    label: "Status",
    render: (row) => <AdminBadge variant={STATUS[row.status].variant}>{STATUS[row.status].label}</AdminBadge>,
  },
  {
    key: "recipients",
    label: "Reached",
    render: (row) => (row.recipientCount > 0 ? `${row.sentCount} of ${row.recipientCount}` : "—"),
  },
  {
    key: "date",
    label: "Date",
    render: (row) => dateFormatter.format(new Date(row.sentAt ?? row.approvedAt ?? row.createdAt)),
  },
];

export default function EmailsPage() {
  const router = useRouter();
  const [items, setItems] = useState<EmailCampaignListItem[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [tab, setTab] = useState("review");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminListEmailCampaigns()
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setSubscriberCount(result.subscriberCount);
      })
      .catch((reason: Error) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const countFor = (statuses: EmailCampaignStatus[]) =>
    items.filter((item) => statuses.includes(item.status)).length;
  const rows = useMemo(() => {
    const statuses = TABS.find((candidate) => candidate.key === tab)?.statuses ?? [];
    return items.filter((item) => statuses.includes(item.status));
  }, [items, tab]);

  return (
    <div>
      <AdminPageHeader
        crumb="Commerce"
        title="Emails"
        subtitle={`New products and freebies wait here for your review. ${subscriberCount} people will get them.`}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((candidate) => (
          <AdminFilterChip
            key={candidate.key}
            active={tab === candidate.key}
            count={countFor(candidate.statuses)}
            onClick={() => setTab(candidate.key)}
          >
            {candidate.label}
          </AdminFilterChip>
        ))}
      </div>
      {error ? <p role="alert" className="text-cocoa-coral">{error}</p> : null}
      {!error && !loading && rows.length === 0 ? (
        <AdminEmptyState
          icon="📬"
          heading={tab === "review" ? "Nothing to review" : "Nothing here yet"}
          body={tab === "review"
            ? "When you publish a new product or freebie, its email appears here. Nothing sends until you approve it."
            : "Emails will appear here once there are some."}
        />
      ) : null}
      {!error && (loading || rows.length > 0) ? (
        <AdminTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          loading={loading}
          onRowClick={(row) => router.push(`/admin/emails/${row.id}`)}
        />
      ) : null}
    </div>
  );
}
