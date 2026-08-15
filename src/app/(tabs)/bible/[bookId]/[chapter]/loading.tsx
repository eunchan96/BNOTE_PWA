export default function BibleChapterLoading() {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center bg-brown-primary px-2">
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/20" />
        <div className="ml-2 h-5 w-24 animate-pulse rounded bg-white/30" />
        <div className="flex-1" />
        <div className="h-9 w-9 shrink-0 rounded-full bg-white/20" />
        <div className="h-9 w-9 shrink-0 rounded-full bg-white/20" />
        <div className="h-9 w-9 shrink-0 rounded-full bg-white/20" />
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 py-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-2 px-3">
            <div className="h-4 w-5 shrink-0 animate-pulse rounded bg-zinc-200" />
            <div
              className="h-4 animate-pulse rounded bg-zinc-200"
              style={{ width: `${70 + ((i * 13) % 25)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}