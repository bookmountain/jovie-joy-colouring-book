import { getFaqs } from "@/data/faqs";
import { FaqLinks } from "@/components/content/faq-links";

export async function FaqAccordion() {
  const faqs = await getFaqs();

  return (
    <div className="divide-y divide-cocoa-line rounded-coco border border-cocoa-line bg-cocoa-cream px-5">
      {faqs.map((faq) => (
        <details className="group py-5" key={faq.question}>
          <summary className="cursor-pointer list-none text-base font-extrabold">
            {faq.question}
          </summary>
          <p className="mt-3 text-sm leading-6 text-cocoa-text">{faq.answer}</p>
          <FaqLinks links={faq.links} />
        </details>
      ))}
    </div>
  );
}
