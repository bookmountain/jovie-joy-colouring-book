'use client';

import { usePathname } from 'next/navigation';
import { AnnouncementBar } from './nav/AnnouncementBar';
import { TopNav } from './nav/TopNav';
import { Footer } from './nav/Footer';
import { MiniCart } from './nav/MiniCart';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <AnnouncementBar />
      <TopNav />
      <main>{children}</main>
      <Footer />
      <MiniCart />
    </>
  );
}
