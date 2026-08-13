"use client";

import { AdminButton, AdminField, AdminInput, AdminLabel } from "@/components/admin/ui";
import type { AdminFaqLink } from "@/lib/adminApi";

type FaqLinksEditorProps = {
  idPrefix: string;
  value: AdminFaqLink[];
  onChange: (next: AdminFaqLink[]) => void;
};

export function FaqLinksEditor({ idPrefix, value, onChange }: FaqLinksEditorProps) {
  function patch(index: number, change: Partial<AdminFaqLink>) {
    onChange(value.map((link, currentIndex) => (
      currentIndex === index ? { ...link, ...change } : link
    )));
  }

  function remove(index: number) {
    onChange(value.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <AdminField>
      <div className="flex items-center justify-between gap-3">
        <AdminLabel>Retailer buttons (optional)</AdminLabel>
        <AdminButton
          onClick={() => onChange([...value, { label: "", href: "" }])}
          size="sm"
          type="button"
          variant="ghost"
        >
          + Add retailer
        </AdminButton>
      </div>
      <p className="text-xs text-cocoa-text">
        These buttons appear with this answer on both the homepage and FAQ page.
      </p>
      {value.map((link, index) => {
        const labelId = `${idPrefix}-link-label-${index}`;
        const hrefId = `${idPrefix}-link-href-${index}`;

        return (
          <div className="grid gap-2 rounded-xl border border-cocoa-line p-3 sm:grid-cols-[1fr_2fr_auto]" key={`${idPrefix}-${index}`}>
            <AdminField>
              <AdminLabel htmlFor={labelId}>Button label</AdminLabel>
              <AdminInput
                id={labelId}
                onChange={(event) => patch(index, { label: event.target.value })}
                placeholder="Amazon"
                value={link.label}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={hrefId}>Destination URL</AdminLabel>
              <AdminInput
                id={hrefId}
                onChange={(event) => patch(index, { href: event.target.value })}
                placeholder="https://www.amazon.com/"
                type="url"
                value={link.href}
              />
            </AdminField>
            <AdminButton
              aria-label={`Remove ${link.label || "retailer"} button`}
              className="self-end"
              onClick={() => remove(index)}
              size="sm"
              type="button"
              variant="danger"
            >
              Remove
            </AdminButton>
          </div>
        );
      })}
    </AdminField>
  );
}
