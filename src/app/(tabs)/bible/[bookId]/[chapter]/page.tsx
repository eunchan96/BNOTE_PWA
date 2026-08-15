import BibleTopBar from "@/components/bible/BibleTopBar";
import ScrollToVerse from "@/components/bible/ScrollToVerse";
import VerseList from "@/components/bible/VerseList";
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

  const supabase = await createClient();

  // 본문(로컬 파일 캐시라 이미 빠름)과 로그인 여부만 기다린다. 하이라이트·메모·설교여부는
  // 사용자별 Supabase 조회라 시간이 걸리므로, 화면을 막지 않고 VerseList가 마운트된 뒤
  // 클라이언트에서 따로 채워 넣는다(getVerseInteractionState).
  const [
    verses,
    secondaryVerses,
    {
      data: { user },
    },
  ] = await Promise.all([
    getChapterVerses(bookId, chapter, translation),
    secondary
      ? getChapterVersesRaw(bookId, chapter, secondary)
      : Promise.resolve(null),
    supabase.auth.getUser(),
  ]);

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
        secondary={secondary}
        isLoggedIn={Boolean(user)}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col pb-2">
        <ScrollToVerse verse={targetVerse} />
        <VerseList
          bookId={bookId}
          chapter={chapter}
          translation={translation}
          verses={verses}
          secondaryVerses={secondaryVerses}
          isLoggedIn={Boolean(user)}
        />
      </div>
    </div>
  );
}
