import Image from "next/image";
import Link from "next/link";
import brandLogo from "@/assets/logo-header-navbar.png";

export function BrandLogo({ compact = false }: { readonly compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="ShopMind home"
      className="group inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
    >
      <span
        className={`relative block shrink-0 overflow-hidden ${
          compact
            ? "h-10 w-[150px]"
            : "h-11 w-[152px] sm:w-[174px]"
        }`}
      >
        <Image
          src={brandLogo}
          alt="ShopMind"
          fill
          priority={!compact}
          sizes={compact ? "150px" : "(min-width: 640px) 174px, 152px"}
          className="object-contain scale-[2.65] transition-transform duration-300 group-hover:scale-[2.72] motion-reduce:transition-none"
        />
      </span>
    </Link>
  );
}
