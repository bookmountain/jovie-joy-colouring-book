import { notFound } from "next/navigation";
import { FreebieGrid } from "@/components/storefront/FreebieGrid";
import { AboutPage } from "@/components/content/about-page";
import { ComicsPage } from "@/components/content/comics-page";
import { FaqAccordion } from "@/components/content/faq-accordion";
import { GalleryGrid } from "@/components/content/gallery-grid";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getStaticPage } from "@/data/content";
import { listFreebies } from "@/lib/freebies";
import { requireNavigationRoute } from "@/lib/require-navigation-route";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const pageSlugAliases: Record<string, string> = {
  faqs: "faq",
};

export default async function StaticPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  await requireNavigationRoute(`/pages/${slug}`);
  const sp = await searchParams;
  const pageSlug = pageSlugAliases[slug] ?? slug;

  let page;
  try {
    page = await getStaticPage(pageSlug);
  } catch {
    notFound();
  }

  const freebies = pageSlug === "freebies" ? await listFreebies() : [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <Breadcrumbs items={[{ label: page.title }]} />
      <div className="mt-8 max-w-3xl">
        <h1 className="coco-heading">{page.title}</h1>
        <p className="mt-4 text-base leading-7 text-cocoa-text">{page.intro}</p>
      </div>
      <div className="mt-10">
        {page.blocks.length > 0 ? (
          <div className="mb-10 max-w-3xl space-y-4 text-base leading-7 text-cocoa-text">
            {page.blocks.map((block, index) => (
              <p key={`${index}-${block}`}>{block}</p>
            ))}
          </div>
        ) : null}
        {pageSlug === "about-us" ? <AboutPage /> : null}
        {pageSlug === "comics" ? <ComicsPage /> : null}
        {pageSlug === "gallery" ? <GalleryGrid /> : null}
        {pageSlug === "faq" ? <FaqAccordion /> : null}
        {pageSlug === "freebies" ? (
          <FreebieGrid
            items={freebies}
            downloadBanner={
              sp?.download === "expired" ? "expired" :
              sp?.download === "invalid" ? "invalid" : null
            }
          />
        ) : null}
      </div>
    </main>
  );
}
