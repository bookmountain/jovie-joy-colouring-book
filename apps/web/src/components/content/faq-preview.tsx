import Link from "next/link";
import Image from "next/image";
import { getFaqArtwork } from "@/data/content";
import { getFaqs } from "@/data/faqs";
import { resolveAssetUrl } from "@/lib/api";

export async function FaqPreview() {
  const [faqArtwork, faqs] = await Promise.all([getFaqArtwork(), getFaqs()]);

  return (
    <section className="bg-white py-10 lg:py-12">
      <div className="mx-auto max-w-[1200px] px-4 lg:px-8">
        {faqArtwork ? (
          <div className="relative aspect-[1518/476] w-full overflow-hidden md:aspect-[1195/300]">
            <Image
              alt="Zoe&Book FAQ illustration"
              className="h-full w-full object-contain"
              fill
              sizes="(min-width: 1200px) 1200px, 100vw"
              src={resolveAssetUrl(faqArtwork)}
            />
          </div>
        ) : null}

        <div className="mx-auto mt-8 max-w-[1150px] divide-y divide-cocoa-line bg-white px-1">
          {faqs.slice(0, 4).map((faq, index) => (
            <details className="group py-5" key={faq.question}>
              <summary
                aria-label={`${index + 1}. ${faq.question}`}
                className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-extrabold uppercase text-cocoa-text md:text-xl"
                role="button"
              >
                <span>{index + 1}. {faq.question}</span>
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f2f2f2] text-xl text-[#c5c5c5] transition group-open:rotate-90"
                >
                  &rsaquo;
                </span>
              </summary>
              <p className="max-w-5xl pb-4 pr-10 text-sm leading-7 text-cocoa-text md:text-base">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link
            className="inline-flex rounded-full border border-cocoa-border bg-white px-6 py-2 text-sm font-extrabold text-cocoa-ink transition hover:bg-cocoa-honey"
            href="/pages/faq"
          >
            View all
          </Link>
        </div>
      </div>
    </section>
  );
}
