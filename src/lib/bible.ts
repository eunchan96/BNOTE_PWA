import type { SupabaseClient } from "@supabase/supabase-js";

export type BibleVerseRow = {
  verse: number;
  text: string;
  title: string | null;
  title2: string | null;
  text2: string | null;
};

export async function getChapterVerses(
  supabase: SupabaseClient,
  bookId: number,
  chapter: number,
  translation: string,
): Promise<BibleVerseRow[]> {
  const { data, error } = await supabase
    .from("bible_verse")
    .select("verse, text, title, title2, text2")
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .eq("translation", translation)
    .order("verse", { ascending: true });

  if (error) throw error;
  return data ?? [];
}