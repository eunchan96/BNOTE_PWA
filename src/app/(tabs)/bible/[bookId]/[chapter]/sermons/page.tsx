import BackButton from "@/components/common/BackButton";
import { getSermonsForChapter } from "@/lib/actions/sermon/sermons";
import { chapterUnit, getBook } from "@/lib/bible/bible-books";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ChapterSermonsPage({
  params,
}: {
  params: Promise<{ bookId: string; chapter: string }>;
}) {
  const { bookId: bookIdParam, chapter: chapterParam } = await params;
  const bookId = Number(bookIdParam);
  const chapter = Number(chapterParam);
  const book = getBook(bookId);
  if (!book || !Number.isInteger(chapter) || chapter < 1) {
    notFound();
  }

  const sermons = await getSermonsForChapter(bookId, chapter);
  const unit = chapterUnit(bookId);

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 truncate text-lg font-bold text-white">
          {book.name} {chapter}
          {unit}의 설교
        </h1>
      </header>

      {sermons.length === 0 && (
        <p className="p-6 text-center text-text-secondary">
          이 장과 연결된 설교노트가 없어요.
        </p>
      )}

      <ul className="flex flex-1 flex-col overflow-y-auto">
        {sermons.map((sermon) => (
          <li key={sermon.id}>
            <Link
              href={`/sermons/${sermon.id}`}
              className="flex cursor-pointer items-center gap-3 px-4 py-3"
            >
              <span
                className="h-9 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: sermon.colorHex ?? "#B0BEC5" }}
              />
              <span className="flex-1 truncate text-15 text-text-primary">
                {sermon.title}
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="text-xs text-zinc-400">
                  {sermon.sermonDate}
                </span>
                {sermon.refLabel && (
                  <span className="mt-0.5 text-xs text-brown-primary">
                    {sermon.refLabel}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
