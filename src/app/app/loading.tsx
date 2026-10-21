/** Shown instantly while the server prepares the next page (Next.js prefetches it). */
export default function Loading() {
  const bar = "rounded-lg bg-blue-100/70";
  return (
    <div role="status" aria-label="Loading" className="animate-pulse">
      <div className={`${bar} h-7 w-48`} />
      <div className={`${bar} mt-2 h-4 w-72 max-w-full`} />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-3xl p-5">
            <div className={`${bar} h-4 w-24`} />
            <div className={`${bar} mt-3 h-8 w-16`} />
          </div>
        ))}
      </div>
      <div className="glass mt-5 rounded-3xl p-5">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className={`${bar} mt-3 h-5 first:mt-0`} style={{ width: `${90 - i * 9}%` }} />)}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
