export default function Loading() {
  return (
    <main role="status" aria-label="Page loading" className="mx-auto max-w-7xl animate-pulse px-4 py-16 sm:px-6 lg:px-8">
      <div className="h-10 w-72 rounded bg-slate-200" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-80 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </main>
  );
}
