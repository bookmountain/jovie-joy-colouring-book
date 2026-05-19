import type { Metadata } from "next";
import { apiGetContent } from "@/lib/api";
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
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoe&Book",
  description: "Cozy coloring books, comics, and printable pages.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const bundle = await apiGetContent();

  return (
    <html lang="en">
      <body>
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
      </body>
    </html>
  );
}
