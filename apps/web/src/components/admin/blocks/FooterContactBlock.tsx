"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminField, AdminInput, AdminLabel } from "@/components/admin/ui";

type Data = {
  blurb?: string;
  customerCareLabel?: string;
  customerCareEmail?: string;
  licensingLabel?: string;
  licensingEmail?: string;
};

export function FooterContactBlock({ data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  return (
    <div className="space-y-3">
      <AdminField>
        <AdminLabel htmlFor="fc-blurb">Blurb</AdminLabel>
        <AdminInput
          id="fc-blurb"
          onChange={(e) => onChange({ ...d, blurb: e.target.value })}
          value={d.blurb ?? ""}
        />
      </AdminField>
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField>
          <AdminLabel htmlFor="fc-care-label">Customer-care label</AdminLabel>
          <AdminInput
            id="fc-care-label"
            onChange={(e) => onChange({ ...d, customerCareLabel: e.target.value })}
            value={d.customerCareLabel ?? ""}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="fc-care-email">Customer-care email</AdminLabel>
          <AdminInput
            id="fc-care-email"
            onChange={(e) => onChange({ ...d, customerCareEmail: e.target.value })}
            type="email"
            value={d.customerCareEmail ?? ""}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="fc-lic-label">Licensing label</AdminLabel>
          <AdminInput
            id="fc-lic-label"
            onChange={(e) => onChange({ ...d, licensingLabel: e.target.value })}
            value={d.licensingLabel ?? ""}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="fc-lic-email">Licensing email</AdminLabel>
          <AdminInput
            id="fc-lic-email"
            onChange={(e) => onChange({ ...d, licensingEmail: e.target.value })}
            type="email"
            value={d.licensingEmail ?? ""}
          />
        </AdminField>
      </div>
    </div>
  );
}
