export function CompareSkeleton({
  productCount,
}: {
  readonly productCount: number;
}) {
  return (
    <div
      role="status"
      aria-label="Comparison loading"
      className="grid gap-6 xl:grid-cols-[17.5rem_minmax(0,1fr)]"
    >
      <div className="surface-card h-fit p-5">
        <div className="skeleton-block h-5 w-36" />
        <div className="skeleton-block mt-3 h-4 w-24" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: productCount }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="skeleton-block size-12 shrink-0" />
              <div className="skeleton-block h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <div className="surface-card overflow-hidden">
          <div className="grid min-h-52 grid-cols-[9rem_repeat(2,minmax(13rem,1fr))] divide-x divide-slate-200 border-b border-slate-200">
            <div className="bg-slate-50 p-5">
              <div className="skeleton-block h-4 w-16" />
            </div>
            {Array.from({ length: Math.min(productCount, 2) }, (_, index) => (
              <div key={index} className="p-5">
                <div className="skeleton-block mx-auto h-24 w-32" />
                <div className="skeleton-block mt-4 h-5 w-4/5" />
                <div className="skeleton-block mt-3 h-4 w-2/5" />
              </div>
            ))}
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex gap-5 px-5 py-4">
                <div className="skeleton-block h-4 w-24 shrink-0" />
                <div className="skeleton-block h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
        <div className="surface-card p-6">
          <div className="skeleton-block h-5 w-44" />
          <div className="skeleton-block mt-4 h-4 w-full" />
          <div className="skeleton-block mt-2 h-4 w-3/4" />
        </div>
      </div>
      <span className="sr-only">Loading canonical product comparison</span>
    </div>
  );
}
