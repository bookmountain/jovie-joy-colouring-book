import { getSiteContent } from "@/data/site-content";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SiteProviders } from "@/components/providers/site-providers";
import { BackInStockModal } from "@/components/overlays/back-in-stock-modal";
import { ChooseOptionsModal } from "@/components/overlays/choose-options-modal";
import { LoginModal } from "@/components/overlays/login-modal";
import { SearchDrawer } from "@/components/overlays/search-drawer";
import { TermsModal } from "@/components/overlays/terms-modal";

// Cache anonymous storefront routes and refresh them in the background at most
// once per minute. Authenticated/admin requests have their own no-store policy.
export const revalidate = 60;

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const bundle = await getSiteContent();

  return (
    <SiteProviders bundle={bundle}>
      <AnnouncementBar />
      <Header />
      {children}
      <Footer />
      <CartDrawer />
      <SearchDrawer />
      <LoginModal />
      <BackInStockModal />
      <ChooseOptionsModal />
      <TermsModal />
    </SiteProviders>
  );
}
