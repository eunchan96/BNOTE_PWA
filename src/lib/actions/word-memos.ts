"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getChapterVerses } from "@/lib/bible";
import { getBook } from "@/lib/bible-books";

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

export type WordMemoRow = {
  id: number;
  verse: number;
  segment: number;
  startOffset: number;
  endOffset: number;
  text: string;
};

export async function getWordMemosForChapter(
  translation: string,
  bookId: number,
  chapter: number,
): Promise<WordMemoRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("word_memo")
    .select("id, verse, segment, start_offset, end_offset, text")
    .eq("member_id", user.id)
    .eq("translation", translation)
    .eq("book_id", bookId)
    .eq("chapter", chapter);

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    verse: r.verse,
    segment: r.segment,
    startOffset: r.start_offset,
    endOffset: r.end_offset,
    text: r.text,
  }));
}

export async function saveWordMemo(
  id: number | null,
  bookId: number,
  chapter: number,
  verse: number,
  translation: string,
  segment: number,
  startOffset: number,
  endOffset: number,
  text: string,
): Promise<WordMemoRow> {
  const { supabase, user } = await requireUser();
  const trimmed = text.trim();

  if (id) {
    const { data, error } = await supabase
      .from("word_memo")
      .update({ text: trimmed, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("member_id", user.id)
      .select("id, verse, segment, start_offset, end_offset, text")
      .single();
    if (error) throw error;
    revalidatePath(`/bible/${bookId}/${chapter}`);
    return {
      id: data.id,
      verse: data.verse,
      segment: data.segment,
      startOffset: data.start_offset,
      endOffset: data.end_offset,
      text: data.text,
    };
  }

  const { data, error } = await supabase
    .from("word_memo")
    .insert({
      member_id: user.id,
      translation,
      book_id: bookId,
      chapter,
      verse,
      segment,
      start_offset: startOffset,
      end_offset: endOffset,
      text: trimmed,
    })
    .select("id, verse, segment, start_offset, end_offset, text")
    .single();
  if (error) throw error;

  revalidatePath(`/bible/${bookId}/${chapter}`);
  return {
    id: data.id,
    verse: data.verse,
    segment: data.segment,
    startOffset: data.start_offset,
    endOffset: data.end_offset,
    text: data.text,
  };
}

export async function deleteWordMemo(id: number, bookId: number, chapter: number) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("word_memo")
    .delete()
    .eq("id", id)
    .eq("member_id", user.id);
  if (error) throw error;

  revalidatePath(`/bible/${bookId}/${chapter}`);
}

export type WordMemoListRow = {
  id: number;
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  word: string;
  text: string;
};

export async function getAllWordMemos(): Promise<WordMemoListRow[]> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("word_memo")
    .select("id, translation, book_id, chapter, verse, segment, start_offset, end_offset, text")
    .eq("member_id", user.id)
    .order("book_id", { ascending: true })
    .order("chapter", { ascending: true })
    .order("verse", { ascending: true });

  if (error) throw error;

  const rows: WordMemoListRow[] = [];
  const cache = new Map<string, Awaited<ReturnType<typeof getChapterVerses>>>();

  for (const r of data ?? []) {
    const cacheKey = `${r.translation}-${r.book_id}-${r.chapter}`;
    let verses = cache.get(cacheKey);
    if (!verses) {
      verses = await getChapterVerses(r.book_id, r.chapter, r.translation);
      cache.set(cacheKey, verses);
    }
    const verseData = verses.find((v) => v.verse === r.verse);
    const fullText = r.segment === 1 ? (verseData?.text2 ?? "") : (verseData?.text ?? "");
    const word = fullText.slice(r.start_offset, r.end_offset);

    rows.push({
      id: r.id,
      bookId: r.book_id,
      bookName: getBook(r.book_id)?.name ?? "",
      chapter: r.chapter,
      verse: r.verse,
      word,
      text: r.text,
    });
  }

  return rows;
}