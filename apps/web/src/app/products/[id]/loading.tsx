export default function ProductDetailLoading() {
  return (
    <main role="status" aria-label="Product details loading" className="page-shell pt-6 sm:pt-7 lg:pt-8">
      <div className="skeleton-block h-4 w-72" />
      <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.8fr)_320px] xl:gap-8">
        <div className="grid gap-4 sm:grid-cols-[76px_minmax(0,1fr)]">
          <div className="hidden space-y-3 sm:block">
            {[0, 1, 2, 3].map((item) => <div key={item} className="skeleton-block size-[72px]" />)}
          </div>
          <div className="skeleton-block aspect-[4/3]" />
        </div>
        <div>
          <div className="skeleton-block h-4 w-32" />
          <div className="skeleton-block mt-4 h-11 w-4/5" />
          <div className="skeleton-block mt-5 h-5 w-48" />
          <div className="skeleton-block mt-7 h-9 w-36" />
          <div className="skeleton-block mt-6 h-32 w-full" />
        </div>
        <div className="surface-card space-y-4 p-6 lg:col-span-2 xl:col-span-1">
          <div className="skeleton-block h-10 w-48" />
          <div className="skeleton-block h-11 w-full" />
          <div className="skeleton-block h-11 w-full" />
          <div className="skeleton-block h-11 w-full" />
        </div>
      </div>
      <div className="surface-panel mt-10 p-7">
        <div className="skeleton-block h-7 w-40" />
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="skeleton-block h-44" />
          <div className="skeleton-block h-44" />
        </div>
      </div>
    </main>
  );
}
