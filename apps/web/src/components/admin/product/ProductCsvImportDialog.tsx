"use client";

import { useRef, useState } from "react";
import {
  adminImportProductsCsv,
  type AdminProductCsvImportMode,
  type AdminProductCsvImportResponse,
} from "@/lib/adminApi";
import { AdminButton, AdminModal } from "@/components/admin/ui";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void | Promise<void>;
};

export function ProductCsvImportDialog({ open, onClose, onImported }: Props) {
  const requestVersion = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<AdminProductCsvImportMode>("create");
  const [result, setResult] = useState<AdminProductCsvImportResponse | null>(null);
  const [phase, setPhase] = useState<"idle" | "previewing" | "importing">("idle");
  const [error, setError] = useState<string | null>(null);

  const busy = phase !== "idle";
  const imported = result?.dryRun === false && result.valid;

  function resetAndClose() {
    requestVersion.current++;
    setFile(null);
    setMode("create");
    setResult(null);
    setPhase("idle");
    setError(null);
    onClose();
  }

  async function preview(nextFile: File, nextMode: AdminProductCsvImportMode) {
    const version = ++requestVersion.current;
    setFile(nextFile);
    setResult(null);
    setError(null);

    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a file with the .csv extension.");
      return;
    }
    if (nextFile.size > MAX_FILE_BYTES) {
      setError("The CSV file must be 2 MB or smaller.");
      return;
    }

    setPhase("previewing");
    try {
      const previewResult = await adminImportProductsCsv(nextFile, nextMode, true);
      if (requestVersion.current === version) setResult(previewResult);
    } catch (reason) {
      if (requestVersion.current === version)
        setError(reason instanceof Error ? reason.message : "Could not validate the CSV.");
    } finally {
      if (requestVersion.current === version) setPhase("idle");
    }
  }

  async function importProducts() {
    if (!file || !result?.valid || !result.dryRun) return;
    const version = ++requestVersion.current;
    setPhase("importing");
    setError(null);
    try {
      const importResult = await adminImportProductsCsv(file, mode, false);
      if (requestVersion.current !== version) return;
      setResult(importResult);
      if (importResult.valid && importResult.importedCount > 0)
        await onImported(importResult.importedCount);
    } catch (reason) {
      if (requestVersion.current === version)
        setError(reason instanceof Error ? reason.message : "Could not import the CSV.");
    } finally {
      if (requestVersion.current === version) setPhase("idle");
    }
  }

  const visibleRows = result?.rows.slice(0, 50) ?? [];

  return (
    <AdminModal
      open={open}
      title="Import products from CSV"
      description="Every file is validated first. Imports are all-or-nothing, so an invalid row writes nothing."
      onClose={busy ? () => {} : resetAndClose}
      size="lg"
      footer={
        <>
          <AdminButton disabled={busy} onClick={resetAndClose} variant="ghost">
            {imported ? "Close" : "Cancel"}
          </AdminButton>
          {!imported ? (
            <AdminButton
              disabled={busy || !file || !result?.valid || !result.dryRun}
              onClick={() => void importProducts()}
              variant="primary"
            >
              {phase === "previewing"
                ? "Checking…"
                : phase === "importing"
                  ? "Importing…"
                  : `Import ${result?.totalRows ?? 0} product${result?.totalRows === 1 ? "" : "s"}`}
            </AdminButton>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <label className="admin-field">
            <span className="admin-label">CSV file</span>
            <input
              accept=".csv,text/csv"
              className="admin-input"
              disabled={busy}
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) void preview(selected, mode);
              }}
              type="file"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Import behavior</span>
            <select
              aria-label="Import behavior"
              className="admin-select"
              disabled={busy}
              onChange={(event) => {
                const nextMode = event.target.value as AdminProductCsvImportMode;
                setMode(nextMode);
                if (file) void preview(file, nextMode);
              }}
              value={mode}
            >
              <option value="create">Create new only</option>
              <option value="upsert">Create or update</option>
            </select>
          </label>
        </div>

        <div className="rounded-xl border border-cocoa-line bg-cocoa-cream p-3 text-xs leading-5 text-cocoa-text">
          <p><strong>Required:</strong> slug, title, product_type, and price_cents (or USD price).</p>
          <p><strong>Optional:</strong> excerpt, description, compare_at_price_cents, available, images, tags, collections, published_at.</p>
          <p>Use <code>|</code> between list values. Dates use ISO-8601; blank published_at means draft. Create or update changes required fields and only the optional columns included in the file.</p>
        </div>

        {phase === "previewing" ? <p role="status" className="text-sm text-cocoa-text">Validating {file?.name}…</p> : null}
        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

        {result ? (
          <div className="space-y-3">
            <div
              className={`rounded-lg p-3 text-sm ${result.valid ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
              role="status"
            >
              {result.dryRun ? (
                result.valid
                  ? `Ready: ${result.createCount} to create and ${result.updateCount} to update.`
                  : `Validation failed. Fix the errors below; no products were imported.`
              ) : (
                result.valid
                  ? `Imported ${result.importedCount} product${result.importedCount === 1 ? "" : "s"}.`
                  : "The catalog changed before import. Nothing was imported; preview the file again."
              )}
            </div>

            {result.errors.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-red-800">
                {result.errors.map((message) => <li key={message}>{message}</li>)}
              </ul>
            ) : null}

            {visibleRows.length > 0 ? (
              <div className="max-h-72 overflow-auto rounded-xl border border-cocoa-line">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-cocoa-cream">
                    <tr>
                      <th className="p-2">Row</th>
                      <th className="p-2">Action</th>
                      <th className="p-2">Product</th>
                      <th className="p-2">Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr className="border-t border-cocoa-line align-top" key={`${row.rowNumber}-${row.slug}`}>
                        <td className="p-2">{row.rowNumber}</td>
                        <td className="p-2 font-semibold">{row.action}</td>
                        <td className="p-2">
                          <span className="block font-semibold">{row.title || "Untitled"}</span>
                          <code>{row.slug || "—"}</code>
                        </td>
                        <td className="p-2 text-red-800">{row.errors.join(" ") || "Ready"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {result.rows.length > visibleRows.length ? (
              <p className="text-xs text-cocoa-text">Showing the first {visibleRows.length} of {result.rows.length} rows.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </AdminModal>
  );
}
