import BibleTopBar from "@/components/BibleTopBar";
import ScrollToVerse from "@/components/ScrollToVerse";
import { getChapterVerses } from "@/lib/bible";
import { chapterUnit, getBook } from "@/lib/bible-books";
import { notFound } from "next/navigation";

const DEFAULT_TRANSLATION = "NKRV";

export default async function BibleChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string; chapter: string }>;
  searchParams: Promise<{ translation?: string; verse?: string }>;
}) {
  const { bookId: bookIdParam, chapter: chapterParam } = await params;
  const { translation = DEFAULT_TRANSLATION, verse: verseParam } =
    await searchParams;
  const targetVerse = verseParam ? Number(verseParam) : null;

  const bookId = Number(bookIdParam);
  const chapter = Number(chapterParam);
  const book = getBook(bookId);

  if (!book || !Number.isInteger(chapter) || chapter < 1) {
    notFound();
  }

  const verses = await getChapterVerses(bookId, chapter, translation);

  if (verses.length === 0) {
    notFound();
  }

  const unit = chapterUnit(bookId);

  return (
    <div className="flex flex-col">
      <BibleTopBar
        bookId={bookId}
        chapter={chapter}
        title={`${book.name} ${chapter}${unit}`}
        translation={translation}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col px-3 py-2">
        <ScrollToVerse verse={targetVerse} />
        <ol className="flex flex-col">
          {verses.map((verse) => (
            <li
              key={verse.verse}
              id={`verse-${verse.verse}`}
              className="scroll-mt-14"
            >
              {verse.title && (
                <p className="px-2 pt-2.5 pb-0 text-sm font-bold text-brown-primary">
                  {verse.title}
                </p>
              )}
              <div className="flex gap-1 py-1 pb-2 pl-1.5 pr-3">
                <span className="mt-0.5 w-[26px] shrink-0 text-center font-bold text-text-secondary">
                  {verse.verse}
                </span>
                <div className="flex flex-1 flex-col">
                  <p className="text-base leading-relaxed text-text-primary">
                    {verse.text}
                  </p>
                  {verse.text2 && (
                    <p className="mt-1 text-[15px] leading-relaxed text-brown-light">
                      {verse.text2}
                    </p>
                  )}
                </div>
              </div>
              {verse.title2 && (
                <p className="px-2 pb-0 text-sm font-bold text-brown-primary">
                  {verse.title2}
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
