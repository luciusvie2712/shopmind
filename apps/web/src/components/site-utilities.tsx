"use client";

import { usePathname } from "next/navigation";
import { BackToTop } from "@/components/back-to-top";
import { QuickContact } from "@/components/quick-contact";
import { SiteFooter } from "@/components/site-footer";

export function SiteUtilities() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <>
      <SiteFooter />
      <QuickContact />
      <BackToTop />
    </>
  );
}
