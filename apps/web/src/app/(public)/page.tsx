import { BlogCategoryCards } from "@/components/content/blog-category-cards";
import { CollectionTiles } from "@/components/content/collection-tiles";
import { FaqPreview } from "@/components/content/faq-preview";
import { FeaturedOnSection } from "@/components/content/featured-on-section";
import { HomeFooterArt } from "@/components/content/home-footer-art";
import { HomeHero } from "@/components/content/home-hero";
import { HomeSection } from "@/components/content/home-section";
import { HomeVideoSection } from "@/components/content/home-video-section";
import { NewsletterForm } from "@/components/content/newsletter-form";
import { getCozyMomentImages } from "@/data/gallery";
import { apiGetContent, resolveAssetUrl, type HeroSlide } from "@/lib/api";
import { getProductsForCollection } from "@/lib/catalog";
import { SafeImage } from "@/components/common/SafeImage";

type RowData = {
  eyebrow?: string;
  title?: string;
  href?: string;
  collectionSlug?: string;
  itemCount?: number;
};

const ROW_FALLBACKS: Record<string, RowData> = {
  "home.row.new-release": { eyebrow: "Just landed", title: "New Release", href: "/collections/new-release", collectionSlug: "new-release", itemCount: 4 },
  "home.row.best-seller": { eyebrow: "Popular products", title: "Best Seller", href: "/collections/frontpage", collectionSlug: "frontpage", itemCount: 4 },
  "home.row.digital":     { eyebrow: "Digital books", title: "Digital", href: "/collections/digital", collectionSlug: "digital", itemCount: 4 },
};

async function resolveReachableAssetUrl(src: string | null | undefined): Promise<string | null> {
  const resolved = resolveAssetUrl(src);
  if (!resolved) return null;
  if (!resolved.includes("/uploads/")) return resolved;

  try {
    const response = await fetch(resolved, { method: "HEAD", cache: "no-store" });
    return response.ok ? resolved : null;
  } catch {
    return null;
  }
}

async function keepReachableHeroSlides(slides: HeroSlide[]): Promise<HeroSlide[]> {
  const checked = await Promise.all(
    slides.map(async (slide) => {
      const image = await resolveReachableAssetUrl(slide.image);
      return image ? { ...slide, image } : null;
    }),
  );
  return checked.filter((slide): slide is HeroSlide => Boolean(slide));
}

export default async function Home() {
  const bundle = await apiGetContent();

  function getRow(key: string): RowData {
    return (bundle.homeProductRows.find((b) => b.key === key)?.data ?? ROW_FALLBACKS[key]) as RowData;
  }
  const rowNewRelease = getRow("home.row.new-release");
  const rowBestSeller = getRow("home.row.best-seller");
  const rowDigital = getRow("home.row.digital");

  const [
    newReleaseProducts,
    bestSellerProducts,
    digitalProducts,
    cozyMomentImages,
  ] = await Promise.all([
    rowNewRelease.collectionSlug ? getProductsForCollection(rowNewRelease.collectionSlug) : Promise.resolve([]),
    rowBestSeller.collectionSlug ? getProductsForCollection(rowBestSeller.collectionSlug) : Promise.resolve([]),
    rowDigital.collectionSlug ? getProductsForCollection(rowDigital.collectionSlug) : Promise.resolve([]),
    getCozyMomentImages(),
  ]);

  const intro = bundle.homeIntro[0]?.data ?? {
    title: "Hi Friend!",
    body: "We craft these coloring books to offer comfort and relaxation. The smallest creative moments can ground a busy day, and these pages are designed to make that pause feel gentle and easy.",
  };
  const cozyHeader = bundle.homeCozyMomentsHeader[0]?.data?.heading ?? "Cozy Moments";
  const heroSlidesData = bundle.homeHeroSlides[0]?.data;
  const heroSlides = await keepReachableHeroSlides(heroSlidesData?.slides ?? []);
  const heroIntervalMs = heroSlidesData?.intervalMs ?? 5000;

  const introTiles: { src: string; alt: string }[] = [];
  const [introImage1, introImage2] = await Promise.all([
    resolveReachableAssetUrl(intro.image1),
    resolveReachableAssetUrl(intro.image2),
  ]);
  if (introImage1) introTiles.push({ src: introImage1, alt: intro.title ?? "Hi Friend" });
  if (introImage2) introTiles.push({ src: introImage2, alt: intro.title ?? "Hi Friend" });
  if (introTiles.length < 2) {
    for (const fallback of cozyMomentImages) {
      if (introTiles.length >= 2) break;
      const fallbackSrc = await resolveReachableAssetUrl(fallback.src);
      if (fallbackSrc) introTiles.push({ src: fallbackSrc, alt: fallback.alt });
    }
  }

  return (
    <main>
      <HomeHero intervalMs={heroIntervalMs} slides={heroSlides} />
      <section className="bg-cocoa-cream py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[0.8fr_1.2fr] md:items-center lg:px-8">
          <div className="grid grid-cols-2 gap-3">
            {introTiles.map((image) => (
              <div
                className="relative aspect-square overflow-hidden rounded-coco bg-white shadow-soft"
                key={image.src}
              >
                <SafeImage
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
            <h2 className="coco-heading">{intro.title}</h2>
            <p className="mt-4 text-base leading-8 text-cocoa-text">
              {intro.body}
            </p>
          </div>
        </div>
      </section>
      <HomeSection
        eyebrow={rowNewRelease.eyebrow ?? ""}
        href={rowNewRelease.href ?? "#"}
        products={newReleaseProducts.slice(0, rowNewRelease.itemCount ?? 4)}
        title={rowNewRelease.title ?? ""}
      />
      <HomeVideoSection />
      <HomeSection
        eyebrow={rowBestSeller.eyebrow ?? ""}
        href={rowBestSeller.href ?? "#"}
        products={bestSellerProducts.slice(0, rowBestSeller.itemCount ?? 4)}
        title={rowBestSeller.title ?? ""}
      />
      <CollectionTiles />
      <HomeSection
        eyebrow={rowDigital.eyebrow ?? ""}
        href={rowDigital.href ?? "#"}
        products={digitalProducts.slice(0, rowDigital.itemCount ?? 4)}
        title={rowDigital.title ?? ""}
      />
      <BlogCategoryCards />
      <FeaturedOnSection />
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <h2 className="coco-heading mb-8">
            {cozyHeader}
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {cozyMomentImages.map((image) => (
              <div
                className="relative aspect-square overflow-hidden rounded-coco-sm bg-cocoa-blush shadow-soft"
                key={image.src}
              >
                <SafeImage
                  alt={image.alt}
                  className="h-full w-full object-cover"
                  fill
                  sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 50vw"
                  src={resolveAssetUrl(image.src)}
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
