import type { Metadata } from "next";
import { UnsubscribePanel } from "@/components/storefront/UnsubscribePanel";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <UnsubscribePanel token={typeof token === "string" ? token : ""} />
    </main>
  );
}
