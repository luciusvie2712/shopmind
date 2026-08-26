export function WishlistPageSkeleton() {
  return (
    <div role="status" aria-label="Wishlist page loading">
      <div className="skeleton-block h-4 w-32" />
      <div className="skeleton-block mt-5 h-11 w-52" />
      <div className="mt-8">
        <WishlistWorkspaceSkeleton />
      </div>
    </div>
  );
}

export function WishlistWorkspaceSkeleton() {
  return (
    <div
      role="status"
      aria-label="Wishlist items loading"
      className="grid items-start gap-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]"
    >
      <aside className="surface-card p-6">
        <div className="skeleton-block mx-auto size-14 rounded-2xl" />
        <div className="skeleton-block mx-auto mt-5 h-9 w-16" />
        <div className="skeleton-block mx-auto mt-3 h-5 w-28" />
        <div className="skeleton-block mt-7 h-12 w-full rounded-xl" />
      </aside>
      <section className="surface-card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="skeleton-block h-5 w-20" />
        </div>
        <div className="divide-y divide-slate-200 px-5 sm:px-6">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[6.5rem_minmax(0,1fr)_8rem] sm:gap-5 sm:py-6"
            >
              <div className="skeleton-block aspect-square" />
              <div className="min-w-0">
                <div className="skeleton-block h-5 w-3/4" />
                <div className="skeleton-block mt-3 h-4 w-1/2" />
                <div className="skeleton-block mt-3 h-4 w-24" />
              </div>
              <div className="col-span-2 space-y-3 sm:col-span-1">
                <div className="skeleton-block ml-auto h-6 w-20" />
                <div className="skeleton-block ml-auto h-11 w-28 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
