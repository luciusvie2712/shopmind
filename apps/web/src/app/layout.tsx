import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BackToTop } from "@/components/back-to-top";
import { QuickContact } from "@/components/quick-contact";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "ShopMind",
    template: "%s | ShopMind",
  },
  description: "AI-powered product discovery and shopping assistant",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">
        <Providers>
          <a
            href="#main-content"
            className="btn-primary sr-only z-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to content
          </a>
          <SiteHeader />
          <div id="main-content" tabIndex={-1} className="min-w-0 flex-1">
            {children}
          </div>
          <SiteFooter />
          <QuickContact />
          <BackToTop />
        </Providers>
      </body>
    </html>
  );
}
