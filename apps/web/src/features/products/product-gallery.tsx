"use client";

import type { ProductImageContract } from "@shopmind/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function ProductGallery({
  images,
  title,
}: {
  readonly images: readonly ProductImageContract[];
  readonly title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];

  if (!activeImage) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-[20px] border border-slate-200 bg-slate-50 text-sm text-slate-500">
        No image available
      </div>
    );
  }

  function selectPrevious(): void {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  }

  function selectNext(): void {
    setActiveIndex((current) => (current + 1) % images.length);
  }

  return (
    <section aria-label={`${title} image gallery`} className="grid min-w-0 gap-4 sm:grid-cols-[76px_minmax(0,1fr)]">
      {images.length > 1 ? (
        <div
          aria-label="Product images"
          className="order-2 flex gap-3 overflow-x-auto pb-1 sm:order-1 sm:max-h-[520px] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden"
        >
          {images.map((image, index) => (
            <button
              key={`${image.url}-${image.sortOrder}`}
              type="button"
              aria-label={`View ${title} image ${index + 1}`}
              aria-pressed={activeIndex === index}
              onClick={() => setActiveIndex(index)}
              className={`relative size-[72px] shrink-0 overflow-hidden rounded-xl border bg-white transition duration-200 hover:-translate-y-0.5 hover:border-teal-300 motion-reduce:transform-none ${activeIndex === index ? "border-teal-600 ring-2 ring-teal-100" : "border-slate-200"}`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="72px"
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className={`relative order-1 aspect-[4/3] min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-card sm:order-2 ${images.length === 1 ? "sm:col-span-2" : ""}`}>
        <Image
          key={activeImage.url}
          src={activeImage.url}
          alt={activeIndex === 0 ? title : `${title} image ${activeIndex + 1}`}
          fill
          priority
          sizes="(min-width: 1280px) 40vw, (min-width: 768px) 55vw, 100vw"
          className="animate-in fade-in zoom-in-95 object-contain p-6 duration-200 hover:scale-[1.01] motion-reduce:animate-none motion-reduce:transform-none sm:p-9"
        />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={selectPrevious}
              aria-label="Previous product image"
              className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-sm backdrop-blur transition hover:scale-105 hover:border-teal-200 hover:text-teal-700 motion-reduce:transform-none"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={selectNext}
              aria-label="Next product image"
              className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-sm backdrop-blur transition hover:scale-105 hover:border-teal-200 hover:text-teal-700 motion-reduce:transform-none"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-bold text-white backdrop-blur">
              {activeIndex + 1} / {images.length}
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
