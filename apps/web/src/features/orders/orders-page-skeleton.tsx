// apps/web/src/features/orders/orders-page-skeleton.tsx
export function OrdersPageSkeleton() {
  return (
    <div role="status" aria-label="Orders page loading">
      <div className="skeleton-block h-4 w-28" />
      <div className="skeleton-block mt-5 h-11 w-40" />
      <div className="mt-8"><OrdersHistorySkeleton /></div>
      <span className="sr-only">Loading your order history.</span>
    </div>
  );
}

export function OrdersHistorySkeleton() {
  return (
    <section role="status" aria-label="Order history loading" className="surface-card animate-pulse overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
        <div>
          <div className="h-5 w-28 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-44 rounded bg-slate-200" />
        </div>
        <div className="h-7 w-20 rounded-full bg-slate-200" />
      </div>
      <div className="divide-y divide-slate-200 px-5 sm:px-6 xl:hidden">
        {[0, 1, 2].map((item) => (
          <div key={item} className="py-6">
            <div className="flex justify-between gap-4">
              <div className="h-4 w-48 max-w-[65%] rounded bg-slate-200" />
              <div className="h-7 w-20 rounded-full bg-slate-200" />
            </div>
            <div className="mt-4 h-4 w-36 rounded bg-slate-200" />
            <div className="mt-6 h-16 rounded-xl bg-slate-100" />
            <div className="mt-5 ml-auto h-7 w-24 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="hidden xl:block">
        <div className="grid grid-cols-[minmax(220px,1.05fr)_180px_120px_minmax(300px,1.35fr)_130px] gap-5 border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          {["w-20", "w-16", "w-16", "w-20", "w-14"].map((width, index) => (
            <div key={index} className={`h-4 rounded bg-slate-200 ${width}`} />
          ))}
        </div>
        {[0, 1, 2].map((item) => (
          <div key={item} className="grid grid-cols-[minmax(220px,1.05fr)_180px_120px_minmax(300px,1.35fr)_130px] gap-5 border-b border-slate-200 px-6 py-6 last:border-0">
            <div className="h-4 w-48 rounded bg-slate-200" />
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="h-7 w-20 rounded-full bg-slate-200" />
            <div className="h-12 rounded bg-slate-100" />
            <div className="ml-auto h-6 w-24 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </section>
  );
}
