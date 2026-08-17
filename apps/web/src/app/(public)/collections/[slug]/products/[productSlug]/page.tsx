import { permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string; productSlug: string }>;
};

export function generateStaticParams() {
  return [];
}

// A product has exactly one home: /products/{slug}. This collection-scoped
// duplicate produced a second URL and a "Collections > … > Product"
// breadcrumb for the same page, so it now redirects to the canonical route.
export default async function CollectionProductPage({ params }: PageProps) {
  const { productSlug } = await params;
  permanentRedirect(`/products/${productSlug}`);
}
