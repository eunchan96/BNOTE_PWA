"use server";

import { getChapterVerses, type BibleVerseRow } from "@/lib/bible";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type BookmarkedVerseRow = {
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/bible/bookmarks");
  }

  return { supabase, user };
}

export async function getBookmarkedVerses(): Promise<BookmarkedVerseRow[]> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("bible_bookmark")
    .select("book_id, chapter, verse, updated_at")
    .eq("member_id", user.id)
    .eq("is_bookmarked", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const rows: BookmarkedVerseRow[] = [];
  const chapterCache = new Map<string, BibleVerseRow[]>();

  for (const b of data ?? []) {
    const key = `${b.book_id}-${b.chapter}`;
    let verses = chapterCache.get(key);
    if (!verses) {
      // 목록은 안드로이드와 동일하게 항상 개역개정(NKRV) 텍스트로 보여준다.
      verses = await getChapterVerses(b.book_id, b.chapter, "NKRV");
      chapterCache.set(key, verses);
    }
    const verseData = verses.find((v) => v.verse === b.verse);
    if (verseData) {
      rows.push({
        bookId: b.book_id,
        chapter: b.chapter,
        verse: b.verse,
        text: verseData.text,
      });
    }
  }

  return rows;
}

export async function removeBookmark(
  bookId: number,
  chapter: number,
  verse: number,
) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("bible_bookmark")
    .update({ is_bookmarked: false })
    .eq("member_id", user.id)
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .eq("verse", verse);

  if (error) throw error;

  revalidatePath("/bible/bookmarks");
}