import { readFile } from "node:fs/promises";
import path from "node:path";

export type BibleVerseRow = {
  verse: number;
  text: string;
  title?: string;
  title2?: string;
  text2?: string;
};

// 함께보기(대역본) 전용 — title2/text2를 절대 합치지 않은 원본 그대로.
// (안드로이드 SecondaryVerseText가 raw text/text2를 그대로 들고 있는 것과 동일)
export type RawVerseRow = {
  verse: number;
  text: string;
  title?: string;
  title2?: string;
  text2?: string;
};

type FlatVerse = {
  book?: number;
  book_id?: number;
  chapter: number;
  verse: number | string;
  text: string;
  title?: string;
  title2?: string;
  title_2?: string;
  text2?: string;
  text_2?: string;
};

type NestedVerse = {
  verse: string | number;
  text: string;
  text_2?: string;
  title_2?: string;
};
type NestedChapter = {
  chapter?: string | number;
  ID?: string;
  verses: NestedVerse[];
};
type NestedBook = {
  book: string;
  chapters: NestedChapter[];
};

const cache = new Map<string, Map<string, BibleVerseRow[]>>();
const rawCache = new Map<string, Map<string, RawVerseRow[]>>();
const searchCache = new Map<string, SearchableVerse[]>();
const inFlight = new Map<string, Promise<void>>();

function chapterKey(bookId: number, chapter: number): string {
  return `${bookId}-${chapter}`;
}

function addRow<T>(
  byChapter: Map<string, T[]>,
  bookId: number,
  chapter: number,
  row: T,
) {
  const key = chapterKey(bookId, chapter);
  const list = byChapter.get(key);
  if (list) {
    list.push(row);
  } else {
    byChapter.set(key, [row]);
  }
}

/**
 * VerseAdapter.kt와 동일한 규칙: title2가 있으면 분리 유지, title2가 없고 text2만 있으면
 * text와 text2를 공백으로 이어붙임. 읽기 화면(주성경) 렌더링에만 쓰는 "합쳐진" 버전.
 */
function finalizeRow(row: RawVerseRow): BibleVerseRow {
  if (row.title2 && row.title2.trim() !== "") {
    return row;
  }
  if (row.text2 && row.text2.trim() !== "") {
    return { verse: row.verse, text: `${row.text} ${row.text2}`, title: row.title };
  }
  return { verse: row.verse, text: row.text, title: row.title };
}

function parseFlatRaw(data: FlatVerse[]): Map<string, RawVerseRow[]> {
  const byChapter = new Map<string, RawVerseRow[]>();
  for (const v of data) {
    const bookId = v.book_id ?? v.book;
    if (bookId === undefined) continue;

    addRow(byChapter, bookId, v.chapter, {
      verse: Number(v.verse),
      text: v.text,
      title: v.title,
      title2: v.title2 ?? v.title_2,
      text2: v.text2 ?? v.text_2,
    });
  }
  return byChapter;
}

/**
 * NIV/ESV 형태. bookId는 배열 순서(1번째=창세기=1)로 매긴다.
 * chapter 번호는 "chapter" 필드가 있으면 그대로, 없으면 "ID"(예: "OT:GEN.2")의 마지막 "." 뒤 숫자.
 * 같은 절 번호가 연속으로 여러 번 나오면(ESV 특유의 문제) 공백으로 합친다. (title2/text2는 합치지 않음)
 */
function parseNestedRaw(data: NestedBook[]): Map<string, RawVerseRow[]> {
  const byChapter = new Map<string, RawVerseRow[]>();

  data.forEach((book, index) => {
    const bookId = index + 1;

    for (const chapterObj of book.chapters) {
      const chapter =
        chapterObj.chapter !== undefined
          ? Number(chapterObj.chapter)
          : Number(chapterObj.ID?.split(".").pop());

      const merged = new Map<
        number,
        { text: string; text2?: string; title2?: string }
      >();
      const order: number[] = [];

      for (const v of chapterObj.verses) {
        const verseNum = Number(v.verse);
        const existing = merged.get(verseNum);
        if (existing) {
          existing.text += " " + v.text;
          if (v.text_2)
            existing.text2 = (existing.text2 ? existing.text2 + " " : "") + v.text_2;
          if (v.title_2) existing.title2 = v.title_2;
        } else {
          merged.set(verseNum, { text: v.text, text2: v.text_2, title2: v.title_2 });
          order.push(verseNum);
        }
      }

      for (const verseNum of order) {
        const m = merged.get(verseNum)!;
        addRow(byChapter, bookId, chapter, {
          verse: verseNum,
          text: m.text,
          title2: m.title2,
          text2: m.text2,
        });
      }
    }
  });

  return byChapter;
}

async function loadTranslation(translation: string): Promise<void> {
  const code = translation.toLowerCase();
  if (cache.has(code)) return;

  const pending = inFlight.get(code);
  if (pending) return pending;

  const promise = (async () => {
    const filePath = path.join(
      process.cwd(),
      "public",
      "bible-data",
      `${code}.json`,
    );

    let raw: string;
    try {
      raw = await readFile(filePath, "utf-8");
    } catch (e) {
      console.error(`[lib/bible] 파일 읽기 실패: ${filePath}`, e);
      cache.set(code, new Map());
      rawCache.set(code, new Map());
      searchCache.set(code, []);
      return;
    }

    const data = JSON.parse(raw);
    const isNested =
      Array.isArray(data) && data.length > 0 && "chapters" in data[0];

    const rawByChapter = isNested ? parseNestedRaw(data) : parseFlatRaw(data);

    const byChapter = new Map<string, BibleVerseRow[]>();
    const flatSearch: SearchableVerse[] = [];

    for (const [key, rows] of rawByChapter.entries()) {
      const [bookIdStr, chapterStr] = key.split("-");
      const bookId = Number(bookIdStr);
      const chapter = Number(chapterStr);

      const combined = rows.map(finalizeRow).sort((a, b) => a.verse - b.verse);
      byChapter.set(key, combined);

      for (const row of combined) {
        flatSearch.push({ bookId, chapter, verse: row.verse, text: row.text });
      }

      rows.sort((a, b) => a.verse - b.verse);
    }

    flatSearch.sort(
      (a, b) => a.bookId - b.bookId || a.chapter - b.chapter || a.verse - b.verse,
    );

    cache.set(code, byChapter);
    rawCache.set(code, rawByChapter);
    searchCache.set(code, flatSearch);
  })();

  inFlight.set(code, promise);
  await promise;
  inFlight.delete(code);
}

export async function getChapterVerses(
  bookId: number,
  chapter: number,
  translation: string,
): Promise<BibleVerseRow[]> {
  await loadTranslation(translation);
  return cache.get(translation.toLowerCase())?.get(chapterKey(bookId, chapter)) ?? [];
}

// 함께보기(대역본) 전용 — title2/text2가 합쳐지지 않은 원본 그대로 반환한다.
export async function getChapterVersesRaw(
  bookId: number,
  chapter: number,
  translation: string,
): Promise<RawVerseRow[]> {
  await loadTranslation(translation);
  return rawCache.get(translation.toLowerCase())?.get(chapterKey(bookId, chapter)) ?? [];
}

// ── 절 개수 표 ──────────────────────────────────────
export async function getVerseCountTable(
  translation: string,
): Promise<Record<string, number>> {
  await loadTranslation(translation);
  const byChapter = cache.get(translation.toLowerCase()) ?? new Map();
  const table: Record<string, number> = {};
  for (const [key, rows] of byChapter.entries()) {
    table[key] = rows.length;
  }
  return table;
}

// ── 검색 ──────────────────────────────────────────
export type SearchableVerse = {
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
};

export async function searchVerses(
  translation: string,
  keyword: string,
): Promise<SearchableVerse[]> {
  await loadTranslation(translation);
  const all = searchCache.get(translation.toLowerCase()) ?? [];
  const normalizedKeyword = keyword.replace(/\s/g, "");
  if (normalizedKeyword === "") return [];

  const results: SearchableVerse[] = [];
  for (const v of all) {
    if (v.text.replace(/\s/g, "").includes(normalizedKeyword)) {
      results.push(v);
      if (results.length >= 200) break;
    }
  }
  return results;
}

// 단어 메모 "다른 구절에도 추가"용 — 공백 제거 없이 정확히 일치하는 부분 문자열만 찾는다
// (본문에서 정확한 시작/끝 위치를 다시 계산해야 해서 공백 제거 검색은 쓸 수 없다).
export async function findVersesContainingExact(
  translation: string,
  word: string,
): Promise<SearchableVerse[]> {
  await loadTranslation(translation);
  const all = searchCache.get(translation.toLowerCase()) ?? [];
  if (word.trim() === "") return [];
  return all.filter((v) => v.text.includes(word));
}