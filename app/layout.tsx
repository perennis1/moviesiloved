import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk-config";
import { getPublicSiteUrl } from "@/lib/public-url";

import "./globals.css";

export const metadata: Metadata = {
  title: "Movies I Loved",
  description: "A metadata-first movie journal built with Next.js, Express, and Prisma.",
  metadataBase: new URL(getPublicSiteUrl())
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#111214] text-white antialiased">
        {isClerkConfigured() ? <ClerkProvider>{children}</ClerkProvider> : children}
      </body>
    </html>
  );
}
