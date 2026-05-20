import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/commerce/product-grid";
import { AboutPage } from "@/components/content/about-page";
import { ComicsPage } from "@/components/content/comics-page";
import { FaqAccordion } from "@/components/content/faq-accordion";
import { GalleryGrid } from "@/components/content/gallery-grid";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getStaticPage } from "@/data/content";
import { getProductsForCollection } from "@/lib/catalog";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const pageSlugAliases: Record<string, string> = {
  faqs: "faq",
};

export default async function StaticPage({ params }: PageProps) {
  const { slug } = await params;
  const pageSlug = pageSlugAliases[slug] ?? slug;

  let page;
  try {
    page = await getStaticPage(pageSlug);
  } catch {
    notFound();
  }

  const freebies = pageSlug === "freebies" ? await getProductsForCollection("freebies") : [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <Breadcrumbs items={[{ label: page.title }]} />
      <div className="mt-8 max-w-3xl">
        <h1 className="coco-heading">{page.title}</h1>
        <p className="mt-4 text-base leading-7 text-cocoa-text">{page.intro}</p>
      </div>
      <div className="mt-10">
        {pageSlug === "about-us" ? <AboutPage /> : null}
        {pageSlug === "comics" ? <ComicsPage /> : null}
        {pageSlug === "gallery" ? <GalleryGrid /> : null}
        {pageSlug === "faq" ? <FaqAccordion /> : null}
        {pageSlug === "freebies" ? (
          <ProductGrid products={freebies} />
        ) : null}
        {pageSlug !== "about-us" &&
        pageSlug !== "comics" &&
        pageSlug !== "gallery" &&
        pageSlug !== "faq" &&
        pageSlug !== "freebies" ? (
          <div className="max-w-3xl space-y-4 text-base leading-7 text-cocoa-text">
            {page.blocks.map((block) => (
              <p key={block}>{block}</p>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
