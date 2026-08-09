"use server";

import { getChapterVersesRaw, type RawVerseRow } from "@/lib/bible";
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
  const chapterCache = new Map<string, RawVerseRow[]>();

  for (const b of data ?? []) {
    const key = `${b.book_id}-${b.chapter}`;
    let verses = chapterCache.get(key);
    if (!verses) {
      // 목록은 안드로이드와 동일하게 항상 개역개정(NKRV)으로 보여주되,
      // text2가 있으면(창 35:22 같은 절) 이어붙여서 전체 내용을 보여준다.
      verses = await getChapterVersesRaw(b.book_id, b.chapter, "NKRV");
      chapterCache.set(key, verses);
    }
    const verseData = verses.find((v) => v.verse === b.verse);
    if (verseData) {
      const fullText = verseData.text2
        ? `${verseData.text} ${verseData.text2}`
        : verseData.text;
      rows.push({
        bookId: b.book_id,
        chapter: b.chapter,
        verse: b.verse,
        text: fullText,
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