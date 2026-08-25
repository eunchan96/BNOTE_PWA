"use server";

import { getHighlightRangesForChapter, type HighlightRangeMap } from "@/lib/actions/bible/highlights";
import { getMemoVerseNumbers } from "@/lib/actions/bible/verse-memos";
import { getWordMemosForChapter, type WordMemoRow } from "@/lib/actions/bible/word-memos";
import { getSermonsForChapter } from "@/lib/actions/sermon/sermons";
import { createClient } from "@/lib/supabase/server";

export type VerseInteractionState = {
  highlightRanges: HighlightRangeMap;
  wordMemos: WordMemoRow[];
  memoVerseNumbers: number[];
  hasSermon: boolean;
};

const EMPTY_STATE: VerseInteractionState = {
  highlightRanges: {},
  wordMemos: [],
  memoVerseNumbers: [],
  hasSermon: false,
};

/**
 * 본문 자체(로컬 파일 캐시)와 달리 이 값들은 로그인한 사용자별 Supabase 조회가 필요하다.
 * 화면을 그리기 전에 기다리지 않고, 화면이 뜬 뒤 클라이언트에서 이 액션 하나만 호출해서
 * 한 번에 채워 넣는다 — 본문이 안드로이드처럼 먼저 즉시 보이고, 하이라이트/메모/설교 아이콘은
 * 살짝 늦게(보통 수백 ms 이내) 뒤따라 입혀진다.
 */
export async function getVerseInteractionState(
  translation: string,
  bookId: number,
  chapter: number,
): Promise<VerseInteractionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return EMPTY_STATE;

  const [highlightRanges, wordMemos, memoVerseNumbers, sermons] = await Promise.all([
    getHighlightRangesForChapter(translation, bookId, chapter),
    getWordMemosForChapter(translation, bookId, chapter),
    getMemoVerseNumbers(bookId, chapter),
    getSermonsForChapter(bookId, chapter),
  ]);

  return {
    highlightRanges,
    wordMemos,
    memoVerseNumbers,
    hasSermon: sermons.length > 0,
  };
}