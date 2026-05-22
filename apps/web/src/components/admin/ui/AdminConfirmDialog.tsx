"use client";

import { useState, type ReactNode } from "react";
import { AdminModal } from "./AdminModal";
import { AdminButton } from "./AdminButton";

export type AdminConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function AdminConfirmDialog({
  open, title, body, confirmLabel = "Confirm", cancelLabel = "Cancel",
  destructive = false, onConfirm, onCancel,
}: AdminConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try { await onConfirm(); }
    finally { setBusy(false); }
  }

  return (
    <AdminModal
      open={open}
      title={title}
      description={body}
      onClose={busy ? () => {} : onCancel}
      size="sm"
      footer={
        <>
          <AdminButton variant="ghost" onClick={onCancel} disabled={busy}>{cancelLabel}</AdminButton>
          <AdminButton variant={destructive ? "danger" : "primary"} onClick={handleConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </AdminButton>
        </>
      }
    >
      <></>
    </AdminModal>
  );
}
