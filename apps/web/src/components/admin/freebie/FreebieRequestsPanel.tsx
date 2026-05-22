"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminFreebieRequests,
  adminResendFreebieRequest,
  type FreebieRequestRow,
} from "@/lib/freebies";
import { AdminPanel } from "@/components/admin/ui";

export function FreebieRequestsPanel({ slug }: { slug: string }) {
  const [rows, setRows] = useState<FreebieRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await adminFreebieRequests(slug));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function resend(id: string) {
    await adminResendFreebieRequest(slug, id);
    await refresh();
  }

  return (
    <AdminPanel>
      <h3 className="mb-3 text-sm font-bold">Email captures ({rows.length})</h3>
      {loading ? (
        <div className="text-sm text-cocoa-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-cocoa-muted">No requests yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-cocoa-muted">
            <tr>
              <th className="py-2">Email</th>
              <th>Submitted</th>
              <th>Opt-in</th>
              <th>Downloads</th>
              <th>Expires</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-cocoa-line">
                <td className="py-2">{r.email}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.optedIntoNewsletter ? "Yes" : "No"}</td>
                <td>{r.downloadCount}</td>
                <td>{new Date(r.expiresAt).toLocaleDateString()}</td>
                <td className="text-right">
                  <button onClick={() => resend(r.id)} className="text-xs text-cocoa-purple underline">Resend link</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminPanel>
  );
}
