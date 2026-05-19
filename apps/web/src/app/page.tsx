import { BlogCategoryCards } from "@/components/content/blog-category-cards";
import { CollectionTiles } from "@/components/content/collection-tiles";
import { FaqPreview } from "@/components/content/faq-preview";
import { FeaturedOnSection } from "@/components/content/featured-on-section";
import { HomeFooterArt } from "@/components/content/home-footer-art";
import { HomeHero } from "@/components/content/home-hero";
import { HomeSection } from "@/components/content/home-section";
import { HomeVideoSection } from "@/components/content/home-video-section";
import { NewsletterForm } from "@/components/content/newsletter-form";
import { cozyMomentImages } from "@/data/gallery";
import { getProductsForCollection } from "@/lib/catalog";
import Image from "next/image";

export default function Home() {
  return (
    <main>
      <HomeHero />
      <section className="bg-cocoa-cream py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[0.8fr_1.2fr] md:items-center lg:px-8">
          <div className="grid grid-cols-2 gap-3">
            {cozyMomentImages.slice(0, 2).map((image) => (
              <div
                className="relative aspect-square overflow-hidden rounded-coco bg-white shadow-soft"
                key={image.src}
              >
                <Image
                  alt={image.alt}
                  className="h-full w-full object-cover"
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  src={image.src}
                />
              </div>
            ))}
          </div>
          <div>
            <h2 className="coco-heading">Hi Friend!</h2>
            <p className="mt-4 text-base leading-8 text-cocoa-text">
              We craft these coloring books to offer comfort and relaxation.
              The smallest creative moments can ground a busy day, and these
              pages are designed to make that pause feel gentle and easy.
            </p>
          </div>
        </div>
      </section>
      <HomeSection
        eyebrow="Just landed"
        href="/collections/new-release"
        products={getProductsForCollection("new-release").slice(0, 4)}
        title="New Release"
      />
      <HomeVideoSection />
      <HomeSection
        eyebrow="Popular products"
        href="/collections/frontpage"
        products={getProductsForCollection("frontpage").slice(0, 4)}
        title="Best Seller"
      />
      <CollectionTiles />
      <HomeSection
        eyebrow="Digital books"
        href="/collections/digital"
        products={getProductsForCollection("digital").slice(0, 4)}
        title="Digital"
      />
      <BlogCategoryCards />
      <FeaturedOnSection />
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="coco-heading mb-8">
            Cozy Moments
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {cozyMomentImages.map((image) => (
              <div
                className="relative aspect-square overflow-hidden rounded-coco-sm bg-cocoa-blush shadow-soft"
                key={image.src}
              >
                <Image
                  alt={image.alt}
                  className="h-full w-full object-cover"
                  fill
                  sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 50vw"
                  src={image.src}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      <FaqPreview />
      <NewsletterForm />
      <HomeFooterArt />
    </main>
  );
}
