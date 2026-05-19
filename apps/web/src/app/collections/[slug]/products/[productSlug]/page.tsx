import { notFound } from "next/navigation";
import { ProductDetailPanel } from "@/components/commerce/product-detail-panel";
import { ProductGallery } from "@/components/commerce/product-gallery";
import { ProductRecommendations } from "@/components/commerce/product-recommendations";
import { ProductVisualStory } from "@/components/commerce/product-visual-story";
import { RecentlyViewed } from "@/components/commerce/recently-viewed";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import {
  getCollectionBySlug,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/catalog";

type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>;
};

export default async function CollectionProductPage({ params }: PageProps) {
  const { slug: collectionSlug, productSlug } = await params;
  const product = getProductBySlug(productSlug);
  const collection = getCollectionBySlug(collectionSlug);

  if (!product || !collection) {
    notFound();
  }

  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Collections", href: "/collections" },
            { label: collection.title, href: `/collections/${collection.slug}` },
            { label: product.title },
          ]}
        />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <ProductGallery product={product} />
          <ProductDetailPanel product={product} />
        </div>
      </div>
      <ProductVisualStory product={product} />
      <ProductRecommendations product={product} />
      <RecentlyViewed
        fallbackProducts={getRelatedProducts(product, 4)}
        product={product}
      />
    </main>
  );
}
