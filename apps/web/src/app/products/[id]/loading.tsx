export default function ProductDetailLoading() {
  return (
    <main
      role="status"
      aria-label="Product details loading"
      className="mx-auto max-w-7xl animate-pulse px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-square rounded-2xl bg-slate-200" />
        <div>
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="mt-4 h-12 w-3/4 rounded bg-slate-200" />
          <div className="mt-8 h-8 w-32 rounded bg-slate-200" />
          <div className="mt-8 h-28 rounded bg-slate-200" />
        </div>
      </div>
    </main>
  );
}
