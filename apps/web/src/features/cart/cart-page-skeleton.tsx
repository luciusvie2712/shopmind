export function CartPageSkeleton() {
  return (
    <div role="status" aria-label="Cart loading" className="animate-pulse">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="mt-6 h-10 w-52 rounded-xl bg-slate-200" />
      <div className="mt-8">
        <CartWorkspaceSkeleton />
      </div>
      <span className="sr-only">Loading the authenticated cart and order summary.</span>
    </div>
  );
}

export function CartWorkspaceSkeleton() {
  return (
    <div role="status" aria-label="Cart items loading" className="grid animate-pulse gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
        <div className="surface-card divide-y divide-slate-100 p-5">
          {[0, 1, 2].map((index) => (
            <div key={index} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 py-5 first:pt-0 last:pb-0 sm:grid-cols-[7rem_minmax(0,1fr)_8rem]">
              <div className="aspect-square rounded-2xl bg-slate-200" />
              <div>
                <div className="h-5 w-3/4 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-1/2 rounded bg-slate-200" />
                <div className="mt-6 h-11 w-36 rounded-xl bg-slate-200" />
              </div>
              <div className="hidden h-6 rounded bg-slate-200 sm:block" />
            </div>
          ))}
        </div>
        <div className="surface-card h-80 p-6">
          <div className="h-6 w-36 rounded bg-slate-200" />
          <div className="mt-8 h-4 rounded bg-slate-200" />
          <div className="mt-5 h-5 rounded bg-slate-200" />
          <div className="mt-8 h-12 rounded-xl bg-slate-200" />
        </div>
      <span className="sr-only">Loading cart items and backend totals.</span>
    </div>
  );
}
