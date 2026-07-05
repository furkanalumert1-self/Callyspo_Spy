import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdSpy — Facebook Reklam → Amazon Ürün Eşleştirme",
  description:
    "Facebook Ads Library'deki reklamları tarayıp aynı ürünün Amazon'da satılıp satılmadığını otomatik tespit eden SaaS platformu.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="tr">
        <body className="min-h-screen bg-background font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
