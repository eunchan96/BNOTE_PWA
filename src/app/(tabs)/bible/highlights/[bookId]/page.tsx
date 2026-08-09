import BackButton from "@/components/BackButton";
import { getHighlightsForBook } from "@/lib/actions/highlights";
import Link from "next/link";

export default async function HighlightBookDetailPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const { bookName, chapterUnit, rows } = await getHighlightsForBook(Number(bookId));

  const grouped = new Map<number, typeof rows>();
  for (const row of rows) {
    const list = grouped.get(row.chapter);
    if (list) list.push(row);
    else grouped.set(row.chapter, [row]);
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 truncate text-lg font-bold text-white">
          {bookName}
        </h1>
      </header>

      {rows.length === 0 && (
        <p className="p-6 text-center text-text-secondary">
          이 책엔 하이라이트한 구절이 없어요.
        </p>
      )}

      <div className="flex flex-1 flex-col overflow-y-auto">
        {[...grouped.entries()].map(([chapter, chapterRows]) => (
          <div key={chapter}>
            <p className="px-4 pb-1.5 pt-4 text-[13px] font-bold text-brown-primary">
              {chapter}
              {chapterUnit}
            </p>
            {chapterRows.map((row) => (
              <Link
                key={row.verse}
                href={`/bible/${bookId}/${row.chapter}?verse=${row.verse}`}
                className="flex cursor-pointer items-start gap-2.5 px-4 py-2.5"
              >
                <span
                  className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: row.colorHex }}
                />
                <p className="line-clamp-2 flex-1 text-sm text-text-primary">
                  {row.verse}절 {row.preview}
                </p>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}