import { notFound } from "next/navigation";
import { ProductDetailPanel } from "@/components/commerce/product-detail-panel";
import { ProductGallery } from "@/components/commerce/product-gallery";
import { ProductRecommendations } from "@/components/commerce/product-recommendations";
import { ProductVisualStory } from "@/components/commerce/product-visual-story";
import { RecentlyViewed } from "@/components/commerce/recently-viewed";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getAllProducts } from "@/data/products";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const [product, allProducts] = await Promise.all([
    getProductBySlug(slug),
    getAllProducts(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <main>
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <Breadcrumbs items={[{ label: product.title }]} />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <ProductGallery product={product} />
          <ProductDetailPanel product={product} />
        </div>
      </div>
      <ProductVisualStory product={product} />
      <ProductRecommendations product={product} />
      <RecentlyViewed
        fallbackProducts={getRelatedProducts(allProducts, product, 4)}
        product={product}
      />
    </main>
  );
}
