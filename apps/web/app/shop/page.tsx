import { fetchProducts } from '@/lib/api';
import { ShopView } from './ShopView';

export default async function ShopPage() {
  const products = await fetchProducts();
  return <ShopView products={products} />;
}
