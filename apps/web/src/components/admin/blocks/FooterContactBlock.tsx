"use client";

import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminField, AdminInput, AdminLabel } from "@/components/admin/ui";

type Data = {
  blurb?: string;
  customerCareLabel?: string;
  customerCareEmail?: string;
  licensingLabel?: string;
  licensingEmail?: string;
  backgroundColor?: string;
};

const DEFAULT_FOOTER_BACKGROUND = "#f8edff";

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
      <AdminField>
        <AdminLabel htmlFor="fc-bg">Background colour</AdminLabel>
        <div className="flex items-center gap-2">
          <input
            aria-label="Pick footer background colour"
            className="h-9 w-12 cursor-pointer rounded border border-cocoa-line bg-white p-1"
            id="fc-bg"
            onChange={(e) => onChange({ ...d, backgroundColor: e.target.value })}
            type="color"
            value={d.backgroundColor ?? DEFAULT_FOOTER_BACKGROUND}
          />
          <AdminInput
            aria-label="Footer background colour hex value"
            className="w-32"
            onChange={(e) => onChange({ ...d, backgroundColor: e.target.value })}
            placeholder={DEFAULT_FOOTER_BACKGROUND}
            value={d.backgroundColor ?? ""}
          />
        </div>
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
