"use server";

import { createClient } from "@/lib/supabase/server";
import { getBook } from "@/lib/bible-books";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

export type VerseMemoRow = { id: number; text: string };

export async function getVerseMemos(
  bookId: number,
  chapter: number,
  verse: number,
): Promise<VerseMemoRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("verse_memo")
    .select("id, text")
    .eq("member_id", user.id)
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .eq("verse", verse)
    .order("id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// 해당 장에서 메모가 하나라도 있는 절 번호 목록 (절 번호 탭 시 분기 처리용).
export async function getMemoVerseNumbers(
  bookId: number,
  chapter: number,
): Promise<number[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("verse_memo")
    .select("verse")
    .eq("member_id", user.id)
    .eq("book_id", bookId)
    .eq("chapter", chapter);

  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.verse))];
}

export async function saveVerseMemo(
  id: number | null,
  bookId: number,
  chapter: number,
  verse: number,
  text: string,
): Promise<number> {
  const { supabase, user } = await requireUser();
  const trimmed = text.trim();

  if (id) {
    const { error } = await supabase
      .from("verse_memo")
      .update({ text: trimmed, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("member_id", user.id);
    if (error) throw error;
    revalidatePath(`/bible/${bookId}/${chapter}`);
    return id;
  }

  const { data, error } = await supabase
    .from("verse_memo")
    .insert({ member_id: user.id, book_id: bookId, chapter, verse, text: trimmed })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath(`/bible/${bookId}/${chapter}`);
  return data.id;
}

export async function deleteVerseMemo(id: number, bookId: number, chapter: number) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("verse_memo")
    .delete()
    .eq("id", id)
    .eq("member_id", user.id);
  if (error) throw error;

  revalidatePath(`/bible/${bookId}/${chapter}`);
}

export type VerseMemoListRow = {
  id: number;
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
};

export async function getAllVerseMemos(): Promise<VerseMemoListRow[]> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("verse_memo")
    .select("id, book_id, chapter, verse, text")
    .eq("member_id", user.id)
    .order("book_id", { ascending: true })
    .order("chapter", { ascending: true })
    .order("verse", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    bookId: r.book_id,
    bookName: getBook(r.book_id)?.name ?? "",
    chapter: r.chapter,
    verse: r.verse,
    text: r.text,
  }));
}