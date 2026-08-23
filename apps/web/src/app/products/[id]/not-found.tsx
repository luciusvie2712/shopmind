import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold text-slate-950">
        Product not found
      </h1>
      <p className="mt-3 text-slate-600">
        This product is unavailable or no longer active.
      </p>
      <Link
        href="/products"
        className="mt-6 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white"
      >
        Back to products
      </Link>
    </main>
  );
}
