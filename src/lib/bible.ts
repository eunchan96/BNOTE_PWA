import { readFile } from "node:fs/promises";
import path from "node:path";

export type BibleVerseRow = {
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
const inFlight = new Map<string, Promise<Map<string, BibleVerseRow[]>>>();

function chapterKey(bookId: number, chapter: number): string {
  return `${bookId}-${chapter}`;
}

function addRow(
  byChapter: Map<string, BibleVerseRow[]>,
  bookId: number,
  chapter: number,
  row: BibleVerseRow,
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
 * VerseAdapter.kt와 동일한 규칙:
 * - title2가 있으면 → text/title2/text2를 그대로 분리 유지 (렌더링 쪽에서 두 줄로 나눠 보여줌)
 * - title2가 없고 text2만 있으면 → text와 text2를 공백으로 이어붙여 하나의 text로 합침
 * - 둘 다 없으면 → text 그대로
 */
function finalizeRow(
  verse: number,
  text: string,
  title: string | undefined,
  title2: string | undefined,
  text2: string | undefined,
): BibleVerseRow {
  if (title2 && title2.trim() !== "") {
    return { verse, text, title, title2, text2 };
  }
  if (text2 && text2.trim() !== "") {
    return { verse, text: `${text} ${text2}`, title };
  }
  return { verse, text, title };
}

function parseFlat(data: FlatVerse[]): Map<string, BibleVerseRow[]> {
  const byChapter = new Map<string, BibleVerseRow[]>();
  for (const v of data) {
    const bookId = v.book_id ?? v.book;
    if (bookId === undefined) continue;

    const row = finalizeRow(
      Number(v.verse),
      v.text,
      v.title,
      v.title2 ?? v.title_2,
      v.text2 ?? v.text_2,
    );
    addRow(byChapter, bookId, v.chapter, row);
  }
  return byChapter;
}

/**
 * NIV/ESV 형태. bookId는 배열 순서(1번째=창세기=1)로 매긴다.
 * chapter 번호는 "chapter" 필드가 있으면 그대로, 없으면 "ID"(예: "OT:GEN.2")의 마지막 "." 뒤 숫자.
 * 같은 절 번호가 연속으로 여러 번 나오면(ESV 특유의 문제) 먼저 공백으로 합친 뒤,
 * text_2가 있으면 title2/text2 규칙을 그대로 적용한다.
 */
function parseNested(data: NestedBook[]): Map<string, BibleVerseRow[]> {
  const byChapter = new Map<string, BibleVerseRow[]>();

  data.forEach((book, index) => {
    const bookId = index + 1;

    for (const chapterObj of book.chapters) {
      const chapter =
        chapterObj.chapter !== undefined
          ? Number(chapterObj.chapter)
          : Number(chapterObj.ID?.split(".").pop());

      const merged = new Map<number, { text: string; text2?: string; title2?: string }>();
      const order: number[] = [];

      for (const v of chapterObj.verses) {
        const verseNum = Number(v.verse);
        const existing = merged.get(verseNum);
        if (existing) {
          existing.text += " " + v.text;
          if (v.text_2) existing.text2 = (existing.text2 ? existing.text2 + " " : "") + v.text_2;
          if (v.title_2) existing.title2 = v.title_2;
        } else {
          merged.set(verseNum, { text: v.text, text2: v.text_2, title2: v.title_2 });
          order.push(verseNum);
        }
      }

      for (const verseNum of order) {
        const m = merged.get(verseNum)!;
        addRow(
          byChapter,
          bookId,
          chapter,
          finalizeRow(verseNum, m.text, undefined, m.title2, m.text2),
        );
      }
    }
  });

  return byChapter;
}

async function loadTranslation(
  translation: string,
): Promise<Map<string, BibleVerseRow[]>> {
  const code = translation.toLowerCase();

  const cached = cache.get(code);
  if (cached) return cached;

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
      const empty = new Map<string, BibleVerseRow[]>();
      cache.set(code, empty);
      return empty;
    }

    const data = JSON.parse(raw);
    const isNested =
      Array.isArray(data) && data.length > 0 && "chapters" in data[0];

    const byChapter = isNested ? parseNested(data) : parseFlat(data);

    for (const list of byChapter.values()) {
      list.sort((a, b) => a.verse - b.verse);
    }

    cache.set(code, byChapter);
    return byChapter;
  })();

  inFlight.set(code, promise);
  const result = await promise;
  inFlight.delete(code);
  return result;
}

export async function getChapterVerses(
  bookId: number,
  chapter: number,
  translation: string,
): Promise<BibleVerseRow[]> {
  const byChapter = await loadTranslation(translation);
  return byChapter.get(chapterKey(bookId, chapter)) ?? [];
}