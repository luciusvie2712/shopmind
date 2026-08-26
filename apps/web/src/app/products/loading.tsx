export default function ProductsLoading() {
  return (
    <main
      role="status"
      aria-label="Catalog loading"
      className="overflow-x-clip bg-white/75"
    >
      <div className="page-shell pt-6 sm:pt-7 lg:pt-8">
        <span className="sr-only">Loading products</span>
        <div className="skeleton-block h-4 w-32" />
        <div className="skeleton-block mt-6 h-10 w-64" />
        <div className="skeleton-block mt-3 h-5 w-80 max-w-full" />

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)] xl:gap-8">
          <aside className="surface-card hidden space-y-6 p-5 lg:block">
            <div className="skeleton-block h-6 w-28" />
            <div className="skeleton-block h-10 w-full" />
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="skeleton-block h-5 w-full" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="skeleton-block h-10" />
              <div className="skeleton-block h-10" />
            </div>
          </aside>

          <section>
            <div className="skeleton-block h-10 w-full lg:hidden" />
            <div className="skeleton-block mt-4 h-14 w-full lg:mt-0" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }, (_, index) => (
                <div key={index} className="surface-card overflow-hidden">
                  <div className="skeleton-block aspect-[1.18/1] rounded-none" />
                  <div className="space-y-3 p-5">
                    <div className="skeleton-block h-4 w-24" />
                    <div className="skeleton-block h-6 w-4/5" />
                    <div className="skeleton-block h-5 w-32" />
                    <div className="skeleton-block h-7 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
