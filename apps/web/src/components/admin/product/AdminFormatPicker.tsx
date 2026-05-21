"use client";

export type ProductFormat = "physical" | "digital" | "sticker" | "freebie";

export const PRODUCT_FORMATS: ReadonlyArray<{
  value: ProductFormat;
  label: string;
  sub: string;
  icon: string;
}> = [
  { value: "physical", label: "Physical book", sub: "Ships to address", icon: "📕" },
  { value: "digital",  label: "Digital PDF",  sub: "Delivered by email", icon: "📄" },
  { value: "sticker",  label: "Sticker pack", sub: "Ships to address", icon: "🌟" },
  { value: "freebie",  label: "Freebie",      sub: "Free download, skips checkout", icon: "🎁" },
];

export function AdminFormatPicker({
  value, onChange,
}: { value: ProductFormat; onChange: (next: ProductFormat) => void }) {
  return (
    <div className="admin-fmt" role="radiogroup" aria-label="Product format">
      {PRODUCT_FORMATS.map((f) => (
        <button
          key={f.value}
          type="button"
          role="radio"
          aria-checked={value === f.value}
          data-state={value === f.value ? "on" : "off"}
          className="admin-fmt-tile"
          onClick={() => onChange(f.value)}
        >
          <span className="ic" aria-hidden>{f.icon}</span>
          {f.label}
          <span className="sub">{f.sub}</span>
        </button>
      ))}
    </div>
  );
}
