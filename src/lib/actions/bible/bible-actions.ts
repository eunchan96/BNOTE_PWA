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

export async function toggleBookmark(
  bookId: number,
  chapter: number,
  verse: number,
) {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("bible_bookmark")
    .select("is_bookmarked")
    .eq("member_id", user.id)
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .eq("verse", verse)
    .maybeSingle();

  const nextValue = !(existing?.is_bookmarked ?? false);

  const { error } = await supabase.from("bible_bookmark").upsert(
    {
      member_id: user.id,
      book_id: bookId,
      chapter,
      verse,
      is_bookmarked: nextValue,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id,book_id,chapter,verse" },
  );

  if (error) throw error;

  revalidatePath(`/bible/${bookId}/${chapter}`);
  return nextValue;
}

// 절 전체 하이라이트. text2가 있으면(창 35:22 같은 예외 케이스) segment 1도 함께 칠한다.
// 여러 절을 한 번에 받는다 (다중 선택 지원).
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