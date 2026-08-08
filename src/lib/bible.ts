import { readFile } from "node:fs/promises";
import path from "node:path";

export type BibleVerseRow = {
  verse: number;
  text: string;
  title?: string;
  title2?: string;
  text2?: string;
};

// book_id/book, title2/title_2, text2/text_2 둘 다 인식한다.
// (정규화된 파일이든 원본 그대로든 상관없이 동작하게 하기 위함)
type RawVerse = {
  book?: number;
  book_id?: number;
  chapter: number;
  verse: number;
  text: string;
  title?: string;
  title2?: string;
  title_2?: string;
  text2?: string;
  text_2?: string;
};

const cache = new Map<string, Map<string, BibleVerseRow[]>>();
const inFlight = new Map<string, Promise<Map<string, BibleVerseRow[]>>>();

function chapterKey(bookId: number, chapter: number): string {
  return `${bookId}-${chapter}`;
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

    const verses: RawVerse[] = JSON.parse(raw);
    const byChapter = new Map<string, BibleVerseRow[]>();

    for (const v of verses) {
      const bookId = v.book_id ?? v.book;
      if (bookId === undefined) continue;

      const key = chapterKey(bookId, v.chapter);
      const row: BibleVerseRow = {
        verse: v.verse,
        text: v.text,
        title: v.title,
        title2: v.title2 ?? v.title_2,
        text2: v.text2 ?? v.text_2,
      };

      const list = byChapter.get(key);
      if (list) {
        list.push(row);
      } else {
        byChapter.set(key, [row]);
      }
    }

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