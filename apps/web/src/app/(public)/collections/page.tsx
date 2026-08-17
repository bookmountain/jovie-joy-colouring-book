import { permanentRedirect } from "next/navigation";

// The collections index is now the all-products page.
export default async function CollectionsPage() {
  permanentRedirect("/products");
}
