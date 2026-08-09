"use server";

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