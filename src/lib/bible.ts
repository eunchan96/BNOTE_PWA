import { readFile } from "node:fs/promises";
import path from "node:path";

export type BibleVerseRow = {
  verse: number;
  text: string;
  title?: string;
  title2?: string;
  text2?: string;
};

type RawVerse = BibleVerseRow & { book_id: number; chapter: number };

// 번역본별 파싱 결과를 프로세스 메모리에 캐싱한다.
// 서버리스 콜드스타트마다 한 번씩만 읽고 파싱하면 되고, 이후 요청은 메모리에서 바로 응답한다.
// (Supabase 왕복이 없으므로 매 장 이동마다 발생하는 네트워크 지연이 사라진다.)
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
    } catch {
      // 아직 안 넣은 번역본 - 빈 지도를 캐싱해서 매번 파일시스템을 다시 뒤지지 않게 한다.
      const empty = new Map<string, BibleVerseRow[]>();
      cache.set(code, empty);
      return empty;
    }

    const verses: RawVerse[] = JSON.parse(raw);
    const byChapter = new Map<string, BibleVerseRow[]>();

    for (const v of verses) {
      const key = chapterKey(v.book_id, v.chapter);
      const list = byChapter.get(key);
      const row: BibleVerseRow = {
        verse: v.verse,
        text: v.text,
        title: v.title,
        title2: v.title2,
        text2: v.text2,
      };
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
