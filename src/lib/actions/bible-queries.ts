"use server";

import { getChapterVerses } from "@/lib/bible";

export async function getVerseNumbers(
  bookId: number,
  chapter: number,
  translation: string,
): Promise<number[]> {
  const verses = await getChapterVerses(bookId, chapter, translation);
  return verses.map((v) => v.verse);
}