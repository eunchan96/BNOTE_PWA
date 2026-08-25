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
    redirect("/login?next=/bible/scraps");
  }

  return { supabase, user };
}

/** getScrapGroups()/getScrapsForGroup()처럼 페이지 최초 로딩 경로에서만 쓰는 가벼운 버전.
 * /bible/scraps는 이미 미들웨어가 같은 요청 안에서 getUser()(네트워크 검증)를
 * 한 번 거쳤으므로, 여기서는 쿠키에서 바로 읽는 getSession()으로 그 결과를 재사용한다. */
async function requireSessionUser() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login?next=/bible/scraps");
  }

  return { supabase, user: session.user };
}

export type ScrapGroupRow = { id: number; name: string; count: number };

export async function getScrapGroups(): Promise<ScrapGroupRow[]> {
  const { supabase, user } = await requireSessionUser();

  const { data: groups, error } = await supabase
    .from("scrap_group")
    .select("id, name")
    .eq("member_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  const rows: ScrapGroupRow[] = [];
  for (const g of groups ?? []) {
    const { count } = await supabase
      .from("scrap")
      .select("id", { count: "exact", head: true })
      .eq("group_id", g.id);
    rows.push({ id: g.id, name: g.name, count: count ?? 0 });
  }
  return rows;
}

export async function getScrapGroupName(groupId: number): Promise<string | null> {
  const { supabase, user } = await requireSessionUser();
  const { data } = await supabase
    .from("scrap_group")
    .select("name")
    .eq("id", groupId)
    .eq("member_id", user.id)
    .maybeSingle();
  return data?.name ?? null;
}

export async function createScrapGroup(name: string) {
  const { supabase, user } = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return;

  const { count } = await supabase
    .from("scrap_group")
    .select("id", { count: "exact", head: true })
    .eq("member_id", user.id);

  const { error } = await supabase
    .from("scrap_group")
    .insert({ member_id: user.id, name: trimmed, sort_order: count ?? 0 });
  if (error) throw error;

  revalidatePath("/bible/scraps");
}

export async function renameScrapGroup(groupId: number, name: string) {
  const { supabase, user } = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return;

  const { error } = await supabase
    .from("scrap_group")
    .update({ name: trimmed })
    .eq("id", groupId)
    .eq("member_id", user.id);
  if (error) throw error;

  revalidatePath("/bible/scraps");
}

export async function deleteScrapGroup(groupId: number) {
  const { supabase, user } = await requireUser();

  // scrap 테이블에 group_id -> scrap_group on delete cascade가 걸려있어서
  // 그룹만 지워도 안의 스크랩이 같이 정리된다.
  const { error } = await supabase
    .from("scrap_group")
    .delete()
    .eq("id", groupId)
    .eq("member_id", user.id);
  if (error) throw error;

  revalidatePath("/bible/scraps");
}

export type ScrapRow = {
  id: number;
  bookId: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  verseText: string;
};

export async function getScrapsForGroup(groupId: number): Promise<ScrapRow[]> {
  const { supabase } = await requireSessionUser();

  const { data, error } = await supabase
    .from("scrap")
    .select("id, book_id, chapter, start_verse, end_verse, verse_text")
    .eq("group_id", groupId)
    .order("create_date", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    bookId: r.book_id,
    chapter: r.chapter,
    startVerse: r.start_verse,
    endVerse: r.end_verse,
    verseText: r.verse_text,
  }));
}

// 연속된 절끼리만 묶어서 각각 따로 스크랩한다 (안드로이드와 동일 로직).
export async function createScraps(
  groupId: number,
  bookId: number,
  chapter: number,
  verses: { verse: number; text: string }[],
): Promise<number> {
  const { supabase, user } = await requireUser();

  const sorted = [...verses].sort((a, b) => a.verse - b.verse);
  const runs: { verse: number; text: string }[][] = [];
  let current: { verse: number; text: string }[] = [sorted[0]];

  for (const v of sorted.slice(1)) {
    if (v.verse === current[current.length - 1].verse + 1) {
      current.push(v);
    } else {
      runs.push(current);
      current = [v];
    }
  }
  runs.push(current);

  const rows = runs.map((run) => ({
    group_id: groupId,
    book_id: bookId,
    chapter,
    start_verse: run[0].verse,
    end_verse: run[run.length - 1].verse,
    verse_text: run.map((v) => v.text).join("\n"),
  }));

  const { error } = await supabase.from("scrap").insert(rows);
  if (error) throw error;

  revalidatePath(`/bible/scraps/${groupId}`);
  return runs.length;
}

export async function deleteScrap(scrapId: number, groupId: number) {
  await requireUser();
  const supabase = (await requireUser()).supabase;

  const { error } = await supabase.from("scrap").delete().eq("id", scrapId);
  if (error) throw error;

  revalidatePath(`/bible/scraps/${groupId}`);
}