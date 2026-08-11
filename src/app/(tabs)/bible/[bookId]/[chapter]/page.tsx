import BibleTopBar from "@/components/bible/BibleTopBar";
import ScrollToVerse from "@/components/bible/ScrollToVerse";
import VerseList from "@/components/bible/VerseList";
import { getHighlightRangesForChapter } from "@/lib/actions/bible/highlights";
import { getMemoVerseNumbers } from "@/lib/actions/bible/verse-memos";
import { getWordMemosForChapter } from "@/lib/actions/bible/word-memos";
import { getChapterVerses, getChapterVersesRaw } from "@/lib/bible/bible";
import { chapterUnit, getBook } from "@/lib/bible/bible-books";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
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
    translation: translationParam,
    secondary: secondaryParam,
    verse: verseParam,
  } = await searchParams;
  const targetVerse = verseParam ? Number(verseParam) : null;

  const cookieStore = await cookies();
  const translation =
    translationParam ??
    cookieStore.get("bnote_translation")?.value ??
    DEFAULT_TRANSLATION;
  const secondary = secondaryParam ?? cookieStore.get("bnote_secondary")?.value;

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

  const [initialHighlightRanges, initialWordMemos, initialMemoVerses] = user
    ? await Promise.all([
        getHighlightRangesForChapter(translation, bookId, chapter),
        getWordMemosForChapter(translation, bookId, chapter),
        getMemoVerseNumbers(bookId, chapter),
      ])
    : [{}, [], []];

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
          initialHighlightRanges={initialHighlightRanges}
          initialWordMemos={initialWordMemos}
          initialMemoVerses={initialMemoVerses}
        />
      </div>
    </div>
  );
}
