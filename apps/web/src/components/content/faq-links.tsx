import type { FaqLink } from "@/lib/api";

type FaqLinksProps = {
  links: FaqLink[] | null;
};

export function FaqLinks({ links }: FaqLinksProps) {
  if (!links?.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          className="rounded-full border border-cocoa-border bg-white px-4 py-1 text-sm font-extrabold text-cocoa-ink transition hover:bg-cocoa-honey"
          href={link.href}
          key={`${link.label}-${link.href}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
