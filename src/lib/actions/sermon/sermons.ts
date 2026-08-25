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
    redirect("/login?next=/sermons");
  }

  return { supabase, user };
}

/** getSermons()처럼 페이지 최초 로딩 경로에서만 쓰는 가벼운 버전.
 * /sermons, /mypage 등은 이미 미들웨어가 같은 요청 안에서 getUser()(네트워크 검증)를
 * 한 번 거쳤으므로, 여기서는 쿠키에서 바로 읽는 getSession()으로 그 결과를 재사용한다 -
 * 탭 전환마다 인증 네트워크 호출이 두 번 일어나던 것을 한 번으로 줄인다.
 * 쓰기(생성/수정/삭제) 액션은 보안을 위해 여전히 requireUser()(getUser())를 쓴다. */
async function requireSessionUser() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login?next=/sermons");
  }

  return { supabase, user: session.user };
}

export type PreacherRow = { id: number; name: string };

export async function getPreachers(): Promise<PreacherRow[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("preacher")
    .select("id, name")
    .eq("member_id", user.id)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createPreacher(name: string): Promise<PreacherRow> {
  const { supabase, user } = await requireUser();
  const { count } = await supabase
    .from("preacher")
    .select("id", { count: "exact", head: true })
    .eq("member_id", user.id);
  const { data, error } = await supabase
    .from("preacher")
    .insert({ member_id: user.id, name: name.trim(), sort_order: count ?? 0 })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

export type CategoryRow = { id: number; name: string; colorHex: string };

export async function getCategories(): Promise<CategoryRow[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("sermon_category")
    .select("id, name, color_hex")
    .or(`member_id.is.null,member_id.eq.${user.id}`)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({ id: c.id, name: c.name, colorHex: c.color_hex }));
}

export type BibleRefInput = {
  startBookId: number;
  startChapter: number;
  startVerse: number;
  endBookId: number;
  endChapter: number;
  endVerse: number;
};

export type SermonListRow = {
  id: number;
  title: string;
  sermonDate: string;
  colorHex: string | null;
  refLabel: string;
  firstBookId: number | null;
  preacherName: string | null;
};

const SHORT_NAMES = [
  "창", "출", "레", "민", "신", "수", "삿", "룻", "삼상", "삼하",
  "왕상", "왕하", "대상", "대하", "스", "느", "에", "욥", "시", "잠",
  "전", "아", "사", "렘", "애", "겔", "단", "호", "욜", "암",
  "옵", "욘", "미", "나", "합", "습", "학", "슥", "말", "마",
  "막", "눅", "요", "행", "롬", "고전", "고후", "갈", "엡", "빌",
  "골", "살전", "살후", "딤전", "딤후", "딛", "몬", "히", "약", "벧전",
  "벧후", "요일", "요이", "요삼", "유", "계",
];

function toShortLabel(r: {
  start_book_id: number;
  start_chapter: number;
  start_verse: number;
  end_book_id: number;
  end_chapter: number;
  end_verse: number;
}): string {
  const abbr = SHORT_NAMES[r.start_book_id - 1] ?? "?";
  if (r.start_book_id === r.end_book_id && r.start_chapter === r.end_chapter) {
    return r.start_verse === r.end_verse
      ? `${abbr} ${r.start_chapter}:${r.start_verse}`
      : `${abbr} ${r.start_chapter}:${r.start_verse}~${r.end_verse}`;
  }
  return `${abbr} ${r.start_chapter}:${r.start_verse}~${r.end_chapter}:${r.end_verse}`;
}

export async function getSermons(): Promise<SermonListRow[]> {
  const { supabase, user } = await requireSessionUser();

  const { data, error } = await supabase
    .from("sermon")
    .select(
      "id, title, sermon_date, sermon_category(color_hex), preacher(name), sermon_bible_ref(start_book_id, start_chapter, start_verse, end_book_id, end_chapter, end_verse)",
    )
    .eq("member_id", user.id)
    .order("sermon_date", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((s) => {
    const refs = s.sermon_bible_ref ?? [];
    const refLabel = refs.map(toShortLabel).join(", ");

    const category = Array.isArray(s.sermon_category) ? s.sermon_category[0] : s.sermon_category;
    const preacher = Array.isArray(s.preacher) ? s.preacher[0] : s.preacher;

    return {
      id: s.id,
      title: s.title,
      sermonDate: s.sermon_date,
      colorHex: category?.color_hex ?? null,
      refLabel,
      firstBookId: refs[0]?.start_book_id ?? null,
      preacherName: preacher?.name ?? null,
    };
  });
}

export async function getSermonsForChapter(
  bookId: number,
  chapter: number,
): Promise<SermonListRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // 안드로이드 SermonDao.getByBookChapter와 동일한 조건:
  // 설교 성경범위의 시작 책이 이 책이고, 시작~끝 장 사이에 이 장이 포함되는 경우.
  const { data: refs, error: refError } = await supabase
    .from("sermon_bible_ref")
    .select("sermon_id, start_chapter, end_chapter, start_book_id")
    .eq("start_book_id", bookId)
    .lte("start_chapter", chapter)
    .gte("end_chapter", chapter);
  if (refError) throw refError;

  const sermonIds = [...new Set((refs ?? []).map((r) => r.sermon_id))];
  if (sermonIds.length === 0) return [];

  const { data, error } = await supabase
    .from("sermon")
    .select(
      "id, title, sermon_date, sermon_category(color_hex), preacher(name), sermon_bible_ref(start_book_id, start_chapter, start_verse, end_book_id, end_chapter, end_verse)",
    )
    .eq("member_id", user.id)
    .in("id", sermonIds)
    .order("sermon_date", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((s) => {
    const refsForSermon = s.sermon_bible_ref ?? [];
    const refLabel = refsForSermon.map(toShortLabel).join(", ");

    const category = Array.isArray(s.sermon_category)
      ? s.sermon_category[0]
      : s.sermon_category;
    const preacher = Array.isArray(s.preacher) ? s.preacher[0] : s.preacher;

    return {
      id: s.id,
      title: s.title,
      sermonDate: s.sermon_date,
      colorHex: category?.color_hex ?? null,
      refLabel,
      firstBookId: refsForSermon[0]?.start_book_id ?? null,
      preacherName: preacher?.name ?? null,
    };
  });
}

export type SermonDetail = {
  id: number;
  title: string;
  sermonDate: string;
  memo: string | null;
  link: string | null;
  preacherId: number | null;
  preacherName: string | null;
  categoryId: number | null;
  refs: BibleRefInput[];
  photoUrls: string[];
};

export async function getSermon(id: number): Promise<SermonDetail | null> {
  const { supabase, user } = await requireUser();

  const { data: sermon, error } = await supabase
    .from("sermon")
    .select("id, title, sermon_date, memo, link, preacher_id, category_id, preacher(name)")
    .eq("id", id)
    .eq("member_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!sermon) return null;

  const { data: refs } = await supabase
    .from("sermon_bible_ref")
    .select("start_book_id, start_chapter, start_verse, end_book_id, end_chapter, end_verse")
    .eq("sermon_id", id);

  const { data: photos } = await supabase
    .from("sermon_photo")
    .select("image_url")
    .eq("sermon_id", id)
    .order("sort_order", { ascending: true });

  const preacher = Array.isArray(sermon.preacher) ? sermon.preacher[0] : sermon.preacher;

  return {
    id: sermon.id,
    title: sermon.title,
    sermonDate: sermon.sermon_date,
    memo: sermon.memo,
    link: sermon.link,
    preacherId: sermon.preacher_id,
    preacherName: preacher?.name ?? null,
    categoryId: sermon.category_id,
    refs: (refs ?? []).map((r) => ({
      startBookId: r.start_book_id,
      startChapter: r.start_chapter,
      startVerse: r.start_verse,
      endBookId: r.end_book_id,
      endChapter: r.end_chapter,
      endVerse: r.end_verse,
    })),
    photoUrls: (photos ?? []).map((p) => p.image_url),
  };
}

export type SermonFormInput = {
  title: string;
  sermonDate: string;
  memo: string;
  link: string;
  preacherId: number | null;
  categoryId: number | null;
  refs: BibleRefInput[];
  photoUrls: string[];
};

export async function createSermon(input: SermonFormInput): Promise<number> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("sermon")
    .insert({
      member_id: user.id,
      title: input.title.trim(),
      sermon_date: input.sermonDate,
      memo: input.memo.trim() || null,
      link: input.link.trim() || null,
      preacher_id: input.preacherId,
      category_id: input.categoryId,
    })
    .select("id")
    .single();
  if (error) throw error;

  await saveRefsAndPhotos(supabase, data.id, input.refs, input.photoUrls);

  revalidatePath("/sermons");
  return data.id;
}

export async function updateSermon(id: number, input: SermonFormInput) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("sermon")
    .update({
      title: input.title.trim(),
      sermon_date: input.sermonDate,
      memo: input.memo.trim() || null,
      link: input.link.trim() || null,
      preacher_id: input.preacherId,
      category_id: input.categoryId,
      modify_date: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("member_id", user.id);
  if (error) throw error;

  await supabase.from("sermon_bible_ref").delete().eq("sermon_id", id);
  await supabase.from("sermon_photo").delete().eq("sermon_id", id);
  await saveRefsAndPhotos(supabase, id, input.refs, input.photoUrls);

  revalidatePath("/sermons");
  revalidatePath(`/sermons/${id}`);
}

async function saveRefsAndPhotos(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  sermonId: number,
  refs: BibleRefInput[],
  photoUrls: string[],
) {
  if (refs.length > 0) {
    await supabase.from("sermon_bible_ref").insert(
      refs.map((r) => ({
        sermon_id: sermonId,
        start_book_id: r.startBookId,
        start_chapter: r.startChapter,
        start_verse: r.startVerse,
        end_book_id: r.endBookId,
        end_chapter: r.endChapter,
        end_verse: r.endVerse,
      })),
    );
  }
  if (photoUrls.length > 0) {
    await supabase.from("sermon_photo").insert(
      photoUrls.map((url, i) => ({ sermon_id: sermonId, image_url: url, sort_order: i })),
    );
  }
}

export async function deleteSermon(id: number) {
  const { supabase, user } = await requireUser();

  const { data: photos } = await supabase
    .from("sermon_photo")
    .select("image_url")
    .eq("sermon_id", id);

  const { error } = await supabase.from("sermon").delete().eq("id", id).eq("member_id", user.id);
  if (error) throw error;

  const paths = (photos ?? [])
    .map((p) => p.image_url.split("/sermon-photos/")[1])
    .filter((p): p is string => Boolean(p));

  if (paths.length > 0) {
    await supabase.storage.from("sermon-photos").remove(paths);
  }

  revalidatePath("/sermons");
}