"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getChapterVerses } from "@/lib/bible/bible";
import { getBook } from "@/lib/bible/bible-books";

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

/** getAllWordMemos()처럼 페이지 최초 로딩 경로에서만 쓰는 가벼운 버전.
 * /bible/memos는 이미 미들웨어가 같은 요청 안에서 getUser()(네트워크 검증)를
 * 한 번 거쳤으므로, 여기서는 쿠키에서 바로 읽는 getSession()으로 그 결과를 재사용한다. */
async function requireSessionUser() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return { supabase, user: session.user };
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
  const { supabase, user } = await requireSessionUser();

  const { data, error } = await supabase
    .from("word_memo")
    .select("id, translation, book_id, chapter, verse, segment, start_offset, end_offset, text")
    .eq("member_id", user.id)
    .order("book_id", { ascending: true })
    .order("chapter", { ascending: true })
    .order("verse", { ascending: true })
    .order("start_offset", { ascending: true })
    .order("end_offset", { ascending: true });

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

import { findVersesContainingExact } from "@/lib/bible/bible";

const SHORT_NAMES = [
  "창", "출", "레", "민", "신", "수", "삿", "룻", "삼상", "삼하",
  "왕상", "왕하", "대상", "대하", "스", "느", "에", "욥", "시", "잠",
  "전", "아", "사", "렘", "애", "겔", "단", "호", "욜", "암",
  "옵", "욘", "미", "나", "합", "습", "학", "슥", "말", "마",
  "막", "눅", "요", "행", "롬", "고전", "고후", "갈", "엡", "빌",
  "골", "살전", "살후", "딤전", "딤후", "딛", "몬", "히", "약", "벧전",
  "벧후", "요일", "요이", "요삼", "유", "계",
];

export async function propagateWordMemo(
  translation: string,
  wordText: string,
  text: string,
  excludeBookId: number,
  excludeChapter: number,
  excludeVerse: number,
): Promise<number> {
  const { supabase, user } = await requireUser();

  if (wordText.trim() === "") return 0;

  const matches = (await findVersesContainingExact(translation, wordText)).filter(
    (v) =>
      !(v.bookId === excludeBookId && v.chapter === excludeChapter && v.verse === excludeVerse),
  );

  if (matches.length === 0) return 0;

  const originLabel = `${SHORT_NAMES[excludeBookId - 1] ?? "?"} ${excludeChapter}:${excludeVerse}`;
  const propagatedText = `${text} (from ${originLabel})`;

  const rows = [];
  for (const m of matches) {
    const idx = m.text.indexOf(wordText);
    if (idx === -1) continue;
    rows.push({
      member_id: user.id,
      translation,
      book_id: m.bookId,
      chapter: m.chapter,
      verse: m.verse,
      segment: 0,
      start_offset: idx,
      end_offset: idx + wordText.length,
      text: propagatedText,
    });
  }

  if (rows.length === 0) return 0;

  const { error } = await supabase.from("word_memo").insert(rows);
  if (error) throw error;

  return rows.length;
}