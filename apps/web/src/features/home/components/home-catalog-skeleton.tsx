export function HomeCatalogSkeleton() {
  return (
    <div role="status" aria-label="Featured catalog loading" className="home-section animate-pulse py-12">
      <span className="sr-only">Loading featured catalog</span>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-52 rounded-[20px] bg-slate-100" />
        ))}
      </div>
      <div className="mt-14 h-8 w-64 rounded-lg bg-slate-100" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-[380px] rounded-[18px] bg-slate-100" />
        ))}
      </div>
      <div className="mt-16 h-[520px] rounded-[26px] bg-blue-50" />
      <div className="mt-10 h-[440px] rounded-[26px] bg-slate-100" />
    </div>
  );
}
