import BibleChapterShell from "@/components/bible/BibleChapterShell";
import {
  getAutoScrollEnabled,
  getReadingPlanEnabled,
  getScrollSpeed,
} from "@/lib/actions/bible/preferences";
import { getChapterVerses, getChapterVersesRaw } from "@/lib/bible/bible";
import { getBook } from "@/lib/bible/bible-books";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

const DEFAULT_TRANSLATION = "NKRV";

/**
 * 이 서버 컴포넌트는 "첫 진입"(직접 URL 접속, 공유 링크, 새로고침)에서만 실행된다.
 * 그 이후 스와이프/버튼/피커로 장을 옮기는 건 BibleChapterShell(클라이언트 컴포넌트)이
 * 서버 라우팅 없이 직접 처리하므로, 이 컴포넌트가 다시 실행되지 않는다.
 */
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

  const supabase = await createClient();

  const [
    verses,
    secondaryVerses,
    {
      data: { user },
    },
    readingPlanEnabled,
    autoScrollEnabled,
    scrollSpeed,
  ] = await Promise.all([
    getChapterVerses(bookId, chapter, translation),
    secondary
      ? getChapterVersesRaw(bookId, chapter, secondary)
      : Promise.resolve(null),
    supabase.auth.getUser(),
    getReadingPlanEnabled(),
    getAutoScrollEnabled(),
    getScrollSpeed(),
  ]);

  if (verses.length === 0) {
    notFound();
  }

  return (
    <BibleChapterShell
      initialBookId={bookId}
      initialChapter={chapter}
      initialVerse={targetVerse}
      translation={translation}
      secondary={secondary}
      isLoggedIn={Boolean(user)}
      readingPlanEnabled={readingPlanEnabled}
      autoScrollEnabled={autoScrollEnabled}
      scrollSpeed={scrollSpeed}
      initialData={{ verses, secondaryVerses }}
    />
  );
}
