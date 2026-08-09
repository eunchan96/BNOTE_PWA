"use server";

import { getChapterVerses, getVerseCountTable } from "@/lib/bible";

export async function getVerseNumbers(
  bookId: number,
  chapter: number,
  translation: string,
): Promise<number[]> {
  const verses = await getChapterVerses(bookId, chapter, translation);
  return verses.map((v) => v.verse);
}

export async function getVerseCounts(
  translation: string,
): Promise<Record<string, number>> {
  return getVerseCountTable(translation);
}