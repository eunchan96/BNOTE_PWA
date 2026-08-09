import BibleTopBar from "@/components/BibleTopBar";
import ScrollToVerse from "@/components/ScrollToVerse";
import VerseList from "@/components/VerseList";
import { getChapterVerses, getChapterVersesRaw } from "@/lib/bible";
import { chapterUnit, getBook } from "@/lib/bible-books";
import { getHighlightsForChapter } from "@/lib/highlights";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const DEFAULT_TRANSLATION = "NKRV";

export default async function BibleChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string; chapter: string }>;
  searchParams: Promise<{
    translation?: string;
    secondary?: string;
    verse?: string;
  }>;
}) {
  const { bookId: bookIdParam, chapter: chapterParam } = await params;
  const {
    translation = DEFAULT_TRANSLATION,
    secondary,
    verse: verseParam,
  } = await searchParams;
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

  const secondaryVerses = secondary
    ? await getChapterVersesRaw(bookId, chapter, secondary)
    : null;

  const unit = chapterUnit(bookId);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialHighlights = user
    ? await getHighlightsForChapter(supabase, translation, bookId, chapter)
    : {};

  return (
    <div className="flex flex-col">
      <BibleTopBar
        bookId={bookId}
        chapter={chapter}
        title={`${book.name} ${chapter}${unit}`}
        translation={translation}
        secondary={secondary}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col px-3 py-2">
        <ScrollToVerse verse={targetVerse} />
        <VerseList
          bookId={bookId}
          chapter={chapter}
          translation={translation}
          verses={verses}
          secondaryVerses={secondaryVerses}
          initialHighlights={initialHighlights}
        />
      </div>
    </div>
  );
}
