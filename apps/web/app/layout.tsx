import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/components/CartProvider';
import { SiteChrome } from '@/components/SiteChrome';

export const metadata: Metadata = {
  title: 'Jovie Joy · Printable Colouring Books for Tiny Hands',
  description: 'Instant-download PDF colouring books. Print as many times as you like, forever.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <SiteChrome>{children}</SiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
