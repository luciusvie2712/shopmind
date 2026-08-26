import type { Metadata } from "next";
import { ChevronRight, Home, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiUnavailableState } from "@/components/catalog-states";
import { TrustSection } from "@/features/home/components/trust-section";
import { ProductDetailContent } from "@/features/products/product-detail-content";
import { ProductGallery } from "@/features/products/product-gallery";
import { ProductPurchasePanel } from "@/features/products/product-purchase-panel";
import { ApiClientError } from "@/lib/api/client";
import { getProductPageData } from "./product-data";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const product = await getProductPageData((await params).id);
    return {
      title: product.title,
      description: product.description.slice(0, 160),
      openGraph: product.thumbnail
        ? { images: [{ url: product.thumbnail, alt: product.title }] }
        : undefined,
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: Props) {
  let product;
  try {
    product = await getProductPageData((await params).id);
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "PRODUCT_NOT_FOUND") {
      notFound();
    }
    return (
      <main className="page-shell">
        <ApiUnavailableState
          requestId={error instanceof ApiClientError ? error.requestId : undefined}
        />
      </main>
    );
  }

  const images = (
    product.images.length > 0
      ? product.images
      : product.thumbnail
        ? [{ url: product.thumbnail, sortOrder: 0 }]
        : []
  ).toSorted((first, second) => first.sortOrder - second.sortOrder);

  return (
    <main className="overflow-x-clip bg-white/75">
      <div className="page-shell pt-6 sm:pt-7 lg:pt-8">
        <nav
          aria-label="Breadcrumb"
          className="hero-enter hero-enter-1 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 text-xs font-medium text-slate-500"
        >
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-teal-700">
            <Home className="size-3.5" aria-hidden="true" /> Home
          </Link>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
          <Link href="/products" className="hover:text-teal-700">Products</Link>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
          <Link href={`/products?category=${encodeURIComponent(product.category.slug)}`} className="hover:text-teal-700">
            {product.category.name}
          </Link>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
          <span aria-current="page" className="max-w-64 truncate text-slate-700">{product.title}</span>
        </nav>

        <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.8fr)_320px] xl:gap-8">
          <div className="hero-enter hero-enter-2 min-w-0">
            <ProductGallery images={images} title={product.title} />
          </div>

          <section className="hero-enter hero-enter-3 min-w-0">
            <p className="page-kicker">{product.category.name}</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl">
              {product.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                {product.rating.toFixed(1)}
              </span>
              {product.reviews.length > 0 ? (
                <a href="#reviews" className="border-l border-slate-300 pl-3 hover:text-teal-700">
                  {product.reviews.length} {product.reviews.length === 1 ? "review" : "reviews"}
                </a>
              ) : null}
              {product.brand ? <span className="border-l border-slate-300 pl-3">{product.brand}</span> : null}
            </div>

            <p className="mt-6 text-3xl font-extrabold tracking-tight text-slate-950">
              {priceFormatter.format(product.price)}
            </p>
            <p className={`mt-3 text-sm font-bold ${product.stock > 0 ? "text-emerald-700" : "text-red-700"}`}>
              <span className="mr-2 inline-block size-2 rounded-full bg-current align-middle" />
              {product.stock > 0 ? `In stock (${product.stock} available)` : "Out of stock"}
            </p>

            <p className="mt-7 line-clamp-6 text-sm leading-7 text-slate-600 sm:text-base">
              {product.description}
            </p>
          </section>

          <div className="hero-enter hero-enter-4 lg:col-span-2 xl:col-span-1">
            <ProductPurchasePanel product={product} />
          </div>
        </div>

        <div className="mt-10 lg:mt-12">
          <ProductDetailContent product={product} />
        </div>
      </div>
      <TrustSection />
    </main>
  );
}
