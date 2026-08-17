import { WishlistPageContent } from "@/components/commerce/wishlist-page-content";
import { requireNavigationRoute } from "@/lib/require-navigation-route";

export default async function WishlistPage() {
  await requireNavigationRoute("/wishlist");
  return <WishlistPageContent />;
}
