import type { SupabaseClient } from "@supabase/supabase-js";

export type BookmarkMap = Record<number, boolean>;
export type HighlightMap = Record<number, string>; // verse -> colorHex (segment 0 대표색)

// Android HighlightColors.palette와 동일
export const HIGHLIGHT_PALETTE = [
  "#FFF9C4",
  "#FFE0B2",
  "#FFCCBC",
  "#F8BBD0",
  "#E1BEE7",
  "#C5CAE9",
  "#B3E5FC",
  "#B2DFDB",
  "#C8E6C9",
  "#F0F4C3",
];

export async function getBookmarksForChapter(
  supabase: SupabaseClient,
  bookId: number,
  chapter: number,
): Promise<BookmarkMap> {
  const { data, error } = await supabase
    .from("bible_bookmark")
    .select("verse, is_bookmarked")
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .eq("is_bookmarked", true);

  if (error) throw error;

  const map: BookmarkMap = {};
  for (const row of data ?? []) {
    map[row.verse] = true;
  }
  return map;
}

export async function getHighlightsForChapter(
  supabase: SupabaseClient,
  translation: string,
  bookId: number,
  chapter: number,
): Promise<HighlightMap> {
  const { data, error } = await supabase
    .from("partial_highlight")
    .select("verse, color_hex")
    .eq("translation", translation)
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .eq("segment", 0);

  if (error) throw error;

  const map: HighlightMap = {};
  for (const row of data ?? []) {
    map[row.verse] = row.color_hex;
  }
  return map;
}