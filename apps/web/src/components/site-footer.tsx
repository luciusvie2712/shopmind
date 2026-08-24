import { AtSign, Globe, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { NewsletterForm } from "@/components/newsletter-form";

const footerGroups = [
  {
    title: "Shop",
    links: [
      { label: "Products", href: "/products" },
      { label: "Categories", href: "/products" },
      { label: "Top Deals", href: "/products?sort=price_asc" },
      { label: "New Arrivals", href: "/products?sort=rating" },
    ],
  },
  {
    title: "AI Search",
    links: [
      { label: "How it works", href: "/search/ai" },
      { label: "Search tips", href: "/search/ai" },
      { label: "Use cases", href: "/search/ai" },
    ],
  },
] as const;

const informationalGroups = [
  { title: "Company", labels: ["About us", "Blog", "Careers", "Contact"] },
  {
    title: "Legal",
    labels: ["Privacy Policy", "Terms of Service", "Cookies Policy"],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.25fr_0.8fr_0.8fr_0.8fr_0.8fr_1.35fr] lg:px-10 lg:py-16">
        <div>
          <BrandLogo compact />
          <p className="mt-4 max-w-56 text-sm leading-6 text-slate-600">
            AI-powered product discovery for smarter shopping.
          </p>
          <div aria-label="Social channels" className="mt-5 flex gap-2 text-slate-500">
            {[Globe, MessageCircle, AtSign, Mail].map((Icon, index) => (
              <span
                key={index}
                className="grid size-9 place-items-center rounded-lg bg-slate-100"
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
        {footerGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-bold text-slate-950">{group.title}</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition hover:text-teal-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {informationalGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-bold text-slate-950">{group.title}</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-500">
              {group.labels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="text-sm font-bold text-slate-950">Stay in the loop</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Get updates on new features and smart shopping tips.
          </p>
          <NewsletterForm />
        </div>
      </div>
      <div className="mx-auto max-w-[1440px] border-t border-slate-200 px-4 py-6 text-center text-sm text-slate-500 sm:px-6 lg:px-10">
        © {new Date().getFullYear()} ShopMind. All rights reserved.
      </div>
    </footer>
  );
}
