import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell mx-auto max-w-3xl text-center">
      <h1 className="page-title mt-0">
        Product not found
      </h1>
      <p className="mt-3 text-slate-600">
        This product is unavailable or no longer active.
      </p>
      <Link
        href="/products"
        className="btn-primary mt-6"
      >
        Back to products
      </Link>
    </main>
  );
}
