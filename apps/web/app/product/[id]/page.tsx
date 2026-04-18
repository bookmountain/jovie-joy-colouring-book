import { notFound } from 'next/navigation';
import { fetchProduct, fetchProducts } from '@/lib/api';
import { ProductView } from './ProductView';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, all] = await Promise.all([fetchProduct(id), fetchProducts()]);
  if (!product) notFound();
  const related = all.filter(p => p.id !== product.id).slice(0, 4);
  return <ProductView product={product} related={related} />;
}
