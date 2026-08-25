"use server";

import { createClient } from "@/lib/supabase/server";
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

export async function isChapterRead(
  bookId: number,
  chapter: number,
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("reading_progress")
    .select("id")
    .eq("member_id", user.id)
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .maybeSingle();

  return Boolean(data);
}

export async function toggleChapterRead(
  bookId: number,
  chapter: number,
): Promise<boolean> {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("reading_progress")
    .select("id")
    .eq("member_id", user.id)
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("reading_progress")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from("reading_progress").insert({
    member_id: user.id,
    book_id: bookId,
    chapter,
  });
  if (error) throw error;
  return true;
}