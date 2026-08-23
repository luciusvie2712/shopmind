import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { ApiUnavailableState } from "@/components/catalog-states";
import { ApiClientError } from "@/lib/api/client";
import { ProductActions } from "@/features/products/product-actions";
import { getProductPageData } from "./product-data";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const product = await getProductPageData((await params).id);
    return {
      title: product.title,
      description: product.description.slice(0, 160),
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
    if (error instanceof ApiClientError && error.code === "PRODUCT_NOT_FOUND")
      notFound();
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <ApiUnavailableState
          requestId={
            error instanceof ApiClientError ? error.requestId : undefined
          }
        />
      </main>
    );
  }
  const images =
    product.images.length > 0
      ? product.images
      : product.thumbnail
        ? [{ url: product.thumbnail, sortOrder: 0 }]
        : [];
  const metadata = Object.entries(product.metadata)
    .filter(([, value]) =>
      ["string", "number", "boolean"].includes(typeof value),
    )
    .slice(0, 12);
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {images.length === 0 ? (
            <div className="grid aspect-square place-items-center rounded-2xl bg-slate-100 text-slate-500">
              No image available
            </div>
          ) : (
            images.map((image) => (
              <div
                key={`${image.url}-${image.sortOrder}`}
                className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <Image
                  src={image.url}
                  alt={product.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-contain p-6"
                />
              </div>
            ))
          )}
        </div>
        <section>
          <p className="text-sm font-medium text-slate-500">
            {product.category.name} · {product.brand ?? "Independent"}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {product.title}
          </h1>
          <div className="mt-5 flex items-center gap-2 text-sm text-slate-700">
            <Star
              className="size-5 fill-amber-400 text-amber-400"
              aria-hidden="true"
            />{" "}
            {product.rating.toFixed(1)} rating
          </div>
          <p className="mt-6 text-3xl font-semibold text-slate-950">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(product.price)}
          </p>
          <p
            className={`mt-3 text-sm font-semibold ${product.stock > 0 ? "text-emerald-700" : "text-red-700"}`}
          >
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>
          <p className="mt-8 leading-7 text-slate-600">{product.description}</p>
          <ProductActions product={product} />
          {metadata.length > 0 ? (
            <dl className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">
              {metadata.map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between gap-6 py-3 text-sm"
                >
                  <dt className="font-medium text-slate-700">{key}</dt>
                  <dd className="text-right text-slate-600">{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      </div>
      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-slate-950">Reviews</h2>
        {product.reviews.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            No reviews yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {product.reviews.map((review, index) => (
              <article
                key={`${review.reviewerName}-${review.reviewedAt}-${index}`}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <p className="font-medium text-slate-900">
                  {review.reviewerName}
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  {review.rating.toFixed(1)} / 5
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {review.comment}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
