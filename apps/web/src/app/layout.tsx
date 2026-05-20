import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoe&Book",
  description: "Cozy coloring books, comics, and printable pages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
