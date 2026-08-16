"use server";

import { getChapterVerses, getChapterVersesRaw, type RawVerseRow } from "@/lib/bible/bible";
import { chapterUnit, getBook } from "@/lib/bible/bible-books";

export type ChapterPeek = {
  bookId: number;
  chapter: number;
  title: string;
  verses: {
    verse: number;
    text: string;
    title?: string;
    title2?: string;
    text2?: string;
  }[];
  secondaryVerses: RawVerseRow[] | null;
};

/**
 * 스와이프로 장을 넘기는 동안 옆 장을 미리 보여주기 위한 가벼운 조회.
 * 하이라이트/메모 같은 사용자별 상호작용 데이터는 뺀 본문 텍스트만 가져온다 -
 * 실제 전환이 끝나면 그 자리에 완전한 인터랙티브 VerseList가 대신 들어선다.
 * secondary(함께보기 대역본)가 지정돼 있으면 그것도 같이 가져와서, 미리보기에서도
 * 함께보기가 빠지지 않고 그대로 보이게 한다.
 */
export async function getChapterPeek(
  bookId: number,
  chapter: number,
  translation: string,
  secondary?: string,
): Promise<ChapterPeek | null> {
  const book = getBook(bookId);
  if (!book) return null;

  const [verses, secondaryVerses] = await Promise.all([
    getChapterVerses(bookId, chapter, translation),
    secondary
      ? getChapterVersesRaw(bookId, chapter, secondary)
      : Promise.resolve(null),
  ]);
  if (verses.length === 0) return null;

  return {
    bookId,
    chapter,
    title: `${book.name} ${chapter}${chapterUnit(bookId)}`,
    verses,
    secondaryVerses,
  };
}