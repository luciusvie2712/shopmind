import { Suspense } from "react";
import { HeroSection } from "@/features/home/components/hero-section";
import { HomeCatalogContent } from "@/features/home/components/home-catalog-content";
import { HomeCatalogSkeleton } from "@/features/home/components/home-catalog-skeleton";
import { TrustSection } from "@/features/home/components/trust-section";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="overflow-x-clip bg-white">
      <HeroSection />
      <Suspense fallback={<HomeCatalogSkeleton />}>
        <HomeCatalogContent />
      </Suspense>
      <TrustSection />
    </main>
  );
}
