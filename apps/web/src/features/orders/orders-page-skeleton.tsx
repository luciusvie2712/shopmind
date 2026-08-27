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
    <section role="status" aria-label="Order history loading" className="animate-pulse space-y-5">
      <div className="rounded-3xl border border-teal-100 bg-teal-50/60 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-teal-200/70" />
          <div className="flex-1"><div className="h-5 w-36 rounded bg-slate-200" /><div className="mt-2 h-4 w-72 max-w-full rounded bg-slate-200" /></div>
          <div className="hidden h-14 w-56 rounded-2xl bg-white sm:block" />
        </div>
      </div>
      {[0, 1].map((order) => (
        <div key={order} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="grid gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-5 sm:grid-cols-2 sm:px-7 lg:grid-cols-4">
            {["w-36", "w-28", "w-24", "w-28"].map((width, index) => <div key={index} className={`h-8 rounded bg-slate-200 ${width} max-w-full ${index === 3 ? "lg:ml-auto" : ""}`} />)}
          </div>
          <div className="px-4 py-3 sm:px-6">
            {[0, 1].map((item) => (
              <div key={item} className="grid gap-4 border-b border-slate-100 py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_130px] sm:items-center sm:px-2">
                <div className="flex items-center gap-4">
                  <div className="size-16 shrink-0 rounded-2xl bg-slate-100 sm:size-[72px]" />
                  <div className="flex-1"><div className="h-4 w-56 max-w-full rounded bg-slate-200" /><div className="mt-3 h-6 w-36 rounded-full bg-slate-100" /></div>
                </div>
                <div className="h-5 w-20 rounded bg-slate-200 sm:ml-auto" />
              </div>
            ))}
          </div>
          <div className="h-14 border-t border-slate-100 bg-slate-50/70" />
        </div>
      ))}
    </section>
  );
}
