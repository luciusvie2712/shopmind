export function AssistantPageSkeleton() {
  return (
    <div role="status" aria-label="Assistant loading" className="animate-pulse">
      <div className="h-4 w-28 rounded bg-slate-200" />
      <div className="mt-6 h-4 w-36 rounded bg-indigo-100" />
      <div className="mt-3 h-10 w-72 max-w-full rounded-xl bg-slate-200" />
      <div className="mt-3 h-5 w-full max-w-2xl rounded bg-slate-200" />
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(260px,310px)]">
        <div className="surface-card hidden h-96 md:block" />
        <div className="surface-card min-h-[34rem] md:col-span-2 xl:col-span-1" />
        <div className="surface-card hidden h-[30rem] md:block" />
      </div>
      <span className="sr-only">Loading the authenticated assistant workspace.</span>
    </div>
  );
}
