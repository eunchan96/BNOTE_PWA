"use server";

import { getChapterVerses } from "@/lib/bible/bible";
import { chapterUnit, getBook } from "@/lib/bible/bible-books";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export type HighlightRange = {
  id: number;
  segment: number;
  start: number;
  end: number;
  colorHex: string;
};

// key: "{verse}-{segment}"
export type HighlightRangeMap = Record<string, HighlightRange[]>;

export async function getHighlightRangesForChapter(
  translation: string,
  bookId: number,
  chapter: number,
): Promise<HighlightRangeMap> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("partial_highlight")
    .select("id, verse, segment, start_offset, end_offset, color_hex")
    .eq("member_id", user.id)
    .eq("translation", translation)
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .order("id", { ascending: true });

  if (error) throw error;

  const map: HighlightRangeMap = {};
  for (const row of data ?? []) {
    const key = `${row.verse}-${row.segment}`;
    const range: HighlightRange = {
      id: row.id,
      segment: row.segment,
      start: row.start_offset,
      end: row.end_offset,
      colorHex: row.color_hex,
    };
    if (map[key]) map[key].push(range);
    else map[key] = [range];
  }
  return map;
}

// 절 전체 하이라이트 (기존 것 지우고 새로 씀)
export async function applyVerseHighlight(
  bookId: number,
  chapter: number,
  translation: string,
  colorHex: string,
  verses: { verse: number; text: string; text2?: string }[],
) {
  const { supabase, user } = await requireUser();

  await supabase
    .from("partial_highlight")
    .delete()
    .eq("member_id", user.id)
    .eq("translation", translation)
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .in(
      "verse",
      verses.map((v) => v.verse),
    );

  const rows = verses.flatMap(({ verse, text, text2 }) => {
    const base = [
      {
        member_id: user.id,
        translation,
        book_id: bookId,
        chapter,
        verse,
        start_offset: 0,
        end_offset: text.length,
        segment: 0,
        color_hex: colorHex,
      },
    ];
    if (text2 && text2.trim() !== "") {
      base.push({
        member_id: user.id,
        translation,
        book_id: bookId,
        chapter,
        verse,
        start_offset: 0,
        end_offset: text2.length,
        segment: 1,
        color_hex: colorHex,
      });
    }
    return base;
  });

  const { error } = await supabase.from("partial_highlight").insert(rows);
  if (error) throw error;

  revalidatePath(`/bible/${bookId}/${chapter}`);
}

export async function removeVerseHighlight(
  bookId: number,
  chapter: number,
  verses: number[],
  translation: string,
) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("partial_highlight")
    .delete()
    .eq("member_id", user.id)
    .eq("translation", translation)
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .in("verse", verses);

  if (error) throw error;

  revalidatePath(`/bible/${bookId}/${chapter}`);
}

// 드래그로 선택한 부분 하이라이트 (기존 것 안 지우고 추가만 함 — 안드로이드와 동일)
export async function applyPartialHighlight(
  bookId: number,
  chapter: number,
  verse: number,
  translation: string,
  segment: number,
  start: number,
  end: number,
  colorHex: string,
): Promise<HighlightRange> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("partial_highlight")
    .insert({
      member_id: user.id,
      translation,
      book_id: bookId,
      chapter,
      verse,
      segment,
      start_offset: start,
      end_offset: end,
      color_hex: colorHex,
    })
    .select("id")
    .single();

  if (error) throw error;

  revalidatePath(`/bible/${bookId}/${chapter}`);
  return { id: data.id, segment, start, end, colorHex };
}


export type HighlightedBookRow = { bookId: number; bookName: string; count: number };

export async function getHighlightedBooks(): Promise<HighlightedBookRow[]> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("partial_highlight")
    .select("book_id, chapter, verse")
    .eq("member_id", user.id);

  if (error) throw error;

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
    .select("id, translation, chapter, verse, segment, start_offset, end_offset, color_hex")
    .eq("member_id", user.id)
    .eq("book_id", bookId)
    .order("id", { ascending: true });

  if (error) throw error;

  type RawRange = {
    id: number;
    segment: number;
    start: number;
    end: number;
    colorHex: string;
  };

  const grouped = new Map<
    string,
    { chapter: number; verse: number; translation: string; ranges: RawRange[] }
  >();

  for (const row of data ?? []) {
    const key = `${row.chapter}-${row.verse}`;
    const entry = grouped.get(key);
    const range: RawRange = {
      id: row.id,
      segment: row.segment,
      start: row.start_offset,
      end: row.end_offset,
      colorHex: row.color_hex,
    };
    if (entry) entry.ranges.push(range);
    else
      grouped.set(key, {
        chapter: row.chapter,
        verse: row.verse,
        translation: row.translation,
        ranges: [range],
      });
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
    const fullText0 = verseData?.text ?? "";
    const fullText1 = verseData?.text2 ?? "";

    const segment0Ranges = entry.ranges.filter((r) => r.segment === 0);
    const segment1Ranges = entry.ranges.filter((r) => r.segment === 1);

    const isWholeVerse = segment0Ranges.some((r) => r.start === 0 && r.end >= fullText0.length);

    let preview: string;
    if (isWholeVerse) {
      preview = fullText1 ? `${fullText0} ${fullText1}` : fullText0;
    } else {
      // 전체가 아니면, 실제로 하이라이트된 부분만 잘라서 보여준다.
      const parts = [...segment0Ranges, ...segment1Ranges]
        .sort((a, b) => a.start - b.start)
        .map((r) => {
          const source = r.segment === 1 ? fullText1 : fullText0;
          return source.slice(r.start, r.end);
        });
      preview = parts.join(" … ");
    }

    const latestColor = entry.ranges[entry.ranges.length - 1].colorHex;

    rows.push({
      chapter: entry.chapter,
      verse: entry.verse,
      colorHex: latestColor,
      preview,
    });
  }

  rows.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);

  return {
    bookName: getBook(bookId)?.name ?? "",
    chapterUnit: chapterUnit(bookId),
    rows,
  };
}