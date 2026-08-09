"use server";

import { getChapterVerses } from "@/lib/bible";
import { chapterUnit, getBook } from "@/lib/bible-books";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/bible/highlights");
  }

  return { supabase, user };
}

export type HighlightedBookRow = { bookId: number; bookName: string; count: number };

export async function getHighlightedBooks(): Promise<HighlightedBookRow[]> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("partial_highlight")
    .select("book_id, chapter, verse")
    .eq("member_id", user.id);

  if (error) throw error;

  // segment 0/1 두 줄이 있을 수 있는 절(소제목으로 쪼개진 예외 구절)도 (장,절) 기준으로는
  // 한 절이므로, 고유 (chapter, verse) 개수로 세야 실제 절 개수가 나온다.
  const countsByBook = new Map<number, Set<string>>();
  for (const row of data ?? []) {
    const key = `${row.chapter}-${row.verse}`;
    const set = countsByBook.get(row.book_id) ?? new Set<string>();
    set.add(key);
    countsByBook.set(row.book_id, set);
  }

  return [...countsByBook.entries()]
    .map(([bookId, set]) => ({
      bookId,
      bookName: getBook(bookId)?.name ?? "",
      count: set.size,
    }))
    .sort((a, b) => a.bookId - b.bookId);
}

export type HighlightRow = {
  chapter: number;
  verse: number;
  colorHex: string;
  preview: string;
};

export async function getHighlightsForBook(bookId: number): Promise<{
  bookName: string;
  chapterUnit: string;
  rows: HighlightRow[];
}> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("partial_highlight")
    .select("translation, chapter, verse, segment, color_hex")
    .eq("member_id", user.id)
    .eq("book_id", bookId);

  if (error) throw error;

  // 같은 절에 segment 0/1 두 개가 있을 수 있으니 (장,절) 기준으로 다시 묶는다.
  const grouped = new Map<
    string,
    { chapter: number; verse: number; translation: string; segments: { segment: number; colorHex: string }[] }
  >();
  for (const row of data ?? []) {
    const key = `${row.chapter}-${row.verse}`;
    const entry = grouped.get(key);
    if (entry) {
      entry.segments.push({ segment: row.segment, colorHex: row.color_hex });
    } else {
      grouped.set(key, {
        chapter: row.chapter,
        verse: row.verse,
        translation: row.translation,
        segments: [{ segment: row.segment, colorHex: row.color_hex }],
      });
    }
  }

  const verseCache = new Map<string, Awaited<ReturnType<typeof getChapterVerses>>>();
  const rows: HighlightRow[] = [];

  for (const entry of grouped.values()) {
    const cacheKey = `${entry.translation}-${entry.chapter}`;
    let verses = verseCache.get(cacheKey);
    if (!verses) {
      verses = await getChapterVerses(bookId, entry.chapter, entry.translation);
      verseCache.set(cacheKey, verses);
    }
    const verseData = verses.find((v) => v.verse === entry.verse);

    const sortedSegments = [...entry.segments].sort((a, b) => a.segment - b.segment);
    const previewParts = sortedSegments.map((s) =>
      s.segment === 1 ? (verseData?.text2 ?? "") : (verseData?.text ?? ""),
    );

    rows.push({
      chapter: entry.chapter,
      verse: entry.verse,
      colorHex: sortedSegments[0].colorHex,
      preview: previewParts.join(" "),
    });
  }

  rows.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);

  return {
    bookName: getBook(bookId)?.name ?? "",
    chapterUnit: chapterUnit(bookId),
    rows,
  };
}