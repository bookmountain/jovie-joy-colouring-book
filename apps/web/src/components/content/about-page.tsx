import Image from "next/image";
import { getAboutSections } from "@/data/content";

export async function AboutPage() {
  const aboutSections = await getAboutSections();

  return (
    <section className="space-y-7">
      {aboutSections.map((section, index) => (
        <article
          className="grid overflow-hidden rounded-[30px] shadow-soft ring-1 ring-black/5 md:grid-cols-2"
          key={section.title}
          style={{ backgroundColor: section.background }}
        >
          <div
            className={`relative aspect-square min-h-[280px] ${
              index % 2 === 1 ? "md:order-2" : ""
            }`}
          >
            <Image
              alt={section.alt}
              className="h-full w-full object-cover"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              src={section.image}
            />
          </div>
          <div className="flex items-center px-5 py-8 text-center sm:px-8 lg:px-12">
            <div className="mx-auto max-w-xl">
              <h2 className="text-[24px] font-extrabold leading-tight text-cocoa-ink md:text-[28px]">
                {section.title}
              </h2>
              <div className="mt-5 space-y-3 text-[17px] font-semibold leading-8 text-cocoa-text">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
