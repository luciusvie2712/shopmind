export default function Loading() {
  return (
    <main role="status" aria-label="Page loading" className="page-shell animate-pulse">
      <div className="skeleton-block h-10 w-72" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="skeleton-block h-80" />
        ))}
      </div>
    </main>
  );
}
