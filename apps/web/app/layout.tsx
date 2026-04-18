import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/components/CartProvider';
import { TopNav } from '@/components/nav/TopNav';
import { AnnouncementBar } from '@/components/nav/AnnouncementBar';
import { Footer } from '@/components/nav/Footer';
import { MiniCart } from '@/components/nav/MiniCart';

export const metadata: Metadata = {
  title: 'Jovie Joy · Printable Colouring Books for Tiny Hands',
  description: 'Instant-download PDF colouring books. Print as many times as you like, forever.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <AnnouncementBar />
          <TopNav />
          <main>{children}</main>
          <Footer />
          <MiniCart />
        </CartProvider>
      </body>
    </html>
  );
}
