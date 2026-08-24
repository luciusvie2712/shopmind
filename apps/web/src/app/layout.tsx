import type { Metadata } from "next";
import type { ReactNode } from "react";
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
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Providers>
          <a
            href="#main-content"
            className="sr-only z-50 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to content
          </a>
          <SiteHeader />
          <div id="main-content" tabIndex={-1} className="min-w-0 flex-1">
            {children}
          </div>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
