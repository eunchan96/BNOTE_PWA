import BackButton from "@/components/BackButton";
import { getAllVerseMemos } from "@/lib/actions/verse-memos";
import Link from "next/link";

export default async function MemoListPage() {
  const memos = await getAllVerseMemos();

  const grouped = new Map<number, typeof memos>();
  for (const memo of memos) {
    const list = grouped.get(memo.bookId);
    if (list) list.push(memo);
    else grouped.set(memo.bookId, [memo]);
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">메모</h1>
      </header>

      {memos.length === 0 && (
        <p className="p-6 text-center text-text-secondary">
          아직 작성한 구절 메모가 없어요.
        </p>
      )}

      <div className="flex flex-1 flex-col overflow-y-auto">
        {[...grouped.entries()].map(([bookId, bookMemos]) => (
          <div key={bookId}>
            <p className="px-4 pb-1.5 pt-4 text-[13px] font-bold text-brown-primary">
              {bookMemos[0].bookName}
            </p>
            {bookMemos.map((memo) => (
              <Link
                key={memo.id}
                href={`/bible/${memo.bookId}/${memo.chapter}?verse=${memo.verse}`}
                className="flex cursor-pointer items-start gap-2 px-4 py-2.5"
              >
                <p className="line-clamp-2 flex-1 text-sm text-text-primary">
                  <span className="font-bold">
                    {memo.chapter}:{memo.verse}
                  </span>{" "}
                  {memo.text}
                </p>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}