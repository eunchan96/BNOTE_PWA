export default function ListLoadingSkeleton() {
  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <div className="ml-2 h-9 w-9 shrink-0 rounded-full bg-white/20" />
        <div className="ml-1 h-5 w-24 animate-pulse rounded bg-white/30" />
      </header>

      <div className="flex flex-col gap-1 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 border-b border-divider py-2.5">
            <div
              className="h-4 animate-pulse rounded bg-zinc-200"
              style={{ width: `${55 + ((i * 17) % 35)}%` }}
            />
            <div
              className="h-3 animate-pulse rounded bg-zinc-100"
              style={{ width: `${30 + ((i * 11) % 25)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}