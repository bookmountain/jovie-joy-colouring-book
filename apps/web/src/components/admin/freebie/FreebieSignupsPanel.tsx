"use client";

import { useEffect, useState } from "react";
import { adminAllFreebieRequests, type FreebieSignupRow } from "@/lib/freebies";
import { AdminButton, AdminPanel } from "@/components/admin/ui";

function toCsv(rows: FreebieSignupRow[]): string {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const header = ["Email", "Freebie", "Submitted", "Newsletter opt-in", "Downloads"];
  const lines = rows.map((r) =>
    [r.email, r.freebieTitle, new Date(r.createdAt).toISOString(), r.optedIntoNewsletter ? "yes" : "no", String(r.downloadCount)]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}

export function FreebieSignupsPanel() {
  const [rows, setRows] = useState<FreebieSignupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAllFreebieRequests()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "freebie-signups.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminPanel>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">Email signups · all freebies ({rows.length})</h3>
        <AdminButton disabled={rows.length === 0} onClick={exportCsv} variant="ghost">
          Export CSV
        </AdminButton>
      </div>
      {loading ? (
        <div className="text-sm text-cocoa-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-cocoa-muted">No signups yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-cocoa-muted">
            <tr>
              <th className="py-2">Email</th>
              <th>Freebie</th>
              <th>Submitted</th>
              <th>Opt-in</th>
              <th>Downloads</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-cocoa-line">
                <td className="py-2">{r.email}</td>
                <td>{r.freebieTitle}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.optedIntoNewsletter ? "Yes" : "No"}</td>
                <td>{r.downloadCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminPanel>
  );
}
