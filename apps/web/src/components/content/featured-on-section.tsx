import Image from "next/image";
import { featuredOnLinks } from "@/data/content";

export function FeaturedOnSection() {
  return (
    <section aria-label="Featured On" className="bg-white py-8 lg:py-10">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="coco-heading mb-6 text-center">Featured On</h2>
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {featuredOnLinks.map((feature) => (
            <a
              aria-label={feature.label}
              className="group relative block overflow-hidden rounded-[16px] bg-cocoa-cream transition duration-200 hover:-translate-y-1 hover:shadow-soft"
              href={feature.href}
              key={feature.label}
              rel="noreferrer"
              target="_blank"
            >
              <Image
                alt={feature.alt}
                className="h-auto w-full transition duration-300 group-hover:scale-[1.03]"
                height={378}
                sizes="(min-width: 1024px) 25vw, 50vw"
                src={feature.image}
                width={500}
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
