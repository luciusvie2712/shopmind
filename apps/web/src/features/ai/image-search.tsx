"use client";

import type { MultimodalSearchContract } from "@shopmind/contracts";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ProductCard } from "@/features/products/product-card";
import { imageSearch } from "@/lib/api/client";

const schema = z.object({
  image: z.instanceof(File).refine((file) => ["image/jpeg", "image/png"].includes(file.type), "Choose a JPEG or PNG image").refine((file) => file.size <= 5_242_880, "Image must be 5 MiB or smaller"),
  maxPrice: z.string().optional().refine((value) => !value || (/^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) >= 0), "Enter a valid maximum price"),
});
type Values = z.infer<typeof schema>;

export function ImageSearch() {
  const form = useForm<Values>();
  const [result, setResult] = useState<MultimodalSearchContract>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(raw: Values) {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) { form.setError("image", { message: parsed.error.issues[0]?.message }); return; }
    setPending(true); setError(undefined);
    try { setResult(await imageSearch({ image: parsed.data.image, ...(parsed.data.maxPrice ? { maxPrice: Number(parsed.data.maxPrice) } : {}) })); }
    catch { setError("Image search failed. Text search remains available."); }
    finally { setPending(false); }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={form.handleSubmit(submit)} className="surface-card space-y-5 p-6">
        <div><label htmlFor="search-image" className="block text-sm font-bold text-slate-900">Product image</label><input id="search-image" type="file" accept="image/jpeg,image/png" onChange={(event) => form.setValue("image", event.target.files?.[0] as File, { shouldValidate: true })} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm" /><p className="mt-1 text-xs text-slate-500">JPEG or PNG, up to 5 MiB. The upload is processed transiently and not stored.</p>{form.formState.errors.image ? <p role="alert" className="mt-2 text-sm text-red-700">{form.formState.errors.image.message}</p> : null}</div>
        <div><label htmlFor="image-max-price" className="block text-sm font-bold text-slate-900">Maximum price (optional)</label><input id="image-max-price" {...form.register("maxPrice")} inputMode="decimal" className="mt-2 rounded-xl border border-slate-200 px-3 py-2" /></div>
        <button type="submit" disabled={pending} className="btn-ai">{pending ? "Searching…" : "Search by image"}</button>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      </form>
      {result ? result.items.length === 0 ? <p className="surface-card p-6 text-sm text-slate-600">No canonical products matched this image.</p> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{result.items.map(({ product }) => <ProductCard key={product.id} product={product} />)}</div> : null}
    </div>
  );
}
