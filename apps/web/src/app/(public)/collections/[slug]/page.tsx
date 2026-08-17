import { permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return [];
}

// Collection listings moved under /products so the menu, URL and breadcrumb
// all say "products". Old links keep working.
export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(`/products?collection=${encodeURIComponent(slug)}`);
}
