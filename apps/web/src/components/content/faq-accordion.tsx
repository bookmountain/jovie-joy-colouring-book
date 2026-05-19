import { faqs } from "@/data/faqs";

export function FaqAccordion() {
  return (
    <div className="divide-y divide-cocoa-line rounded-coco border border-cocoa-line bg-cocoa-cream px-5">
      {faqs.map((faq) => (
        <details className="group py-5" key={faq.question}>
          <summary className="cursor-pointer list-none text-base font-extrabold">
            {faq.question}
          </summary>
          <p className="mt-3 text-sm leading-6 text-cocoa-text">{faq.answer}</p>
          {faq.links?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {faq.links.map((link) => (
                <a
                  className="rounded-full border border-cocoa-border bg-white px-4 py-1 text-sm font-extrabold hover:bg-cocoa-honey"
                  href={link.href}
                  key={link.label}
                  rel="noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </details>
      ))}
    </div>
  );
}
