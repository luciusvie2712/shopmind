"use client";

import { ProtectedRoute } from "@/features/auth/protected-route";
import { ProductGrid } from "@/features/products/product-grid";
import { useWishlistQuery } from "@/features/wishlist/wishlist.queries";

export default function WishlistPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <ProtectedRoute>
        <WishlistContent />
      </ProtectedRoute>
    </main>
  );
}

function WishlistContent() {
  const wishlist = useWishlistQuery();
  if (wishlist.isPending)
    return <div role="status" aria-label="Wishlist loading" className="h-72 animate-pulse rounded-2xl bg-slate-200" />;
  if (wishlist.isError)
    return (
      <section
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-8"
      >
        <p>Wishlist is temporarily unavailable.</p>
        <button
          onClick={() => void wishlist.refetch()}
          className="mt-4 rounded-lg bg-red-900 px-4 py-2 text-sm text-white"
        >
          Try again
        </button>
      </section>
    );
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Wishlist
      </h1>
      <div className="mt-8">
        {wishlist.data.items.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">No saved products yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Use the wishlist action on a product to save it here.
            </p>
          </section>
        ) : (
          <ProductGrid products={wishlist.data.items} />
        )}
      </div>
    </>
  );
}
