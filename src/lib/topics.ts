import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getChapterVerses } from "@/lib/bible";
import { getBook, chapterUnit } from "@/lib/bible-books";

export type VerseRef = {
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number;
};
export type TopicalVerseGroup = { id: string; title: string; verses: VerseRef[] };

let cache: TopicalVerseGroup[] | null = null;

async function load(): Promise<TopicalVerseGroup[]> {
  if (cache) return cache;
  const filePath = path.join(
    process.cwd(),
    "public",
    "knowledge-data",
    "topical_verses.json",
  );
  const raw = await readFile(filePath, "utf-8");
  cache = JSON.parse(raw) as TopicalVerseGroup[];
  return cache;
}

export async function getTopics(): Promise<TopicalVerseGroup[]> {
  return load();
}

export async function getTopic(id: string): Promise<TopicalVerseGroup | undefined> {
  const topics = await load();
  return topics.find((t) => t.id === id);
}

export type ResolvedVerseCard = { ref: VerseRef; label: string; text: string };

export async function resolveTopicVerses(
  topic: TopicalVerseGroup,
): Promise<ResolvedVerseCard[]> {
  const cards: ResolvedVerseCard[] = [];

  for (const ref of topic.verses) {
    const verses = await getChapterVerses(ref.bookId, ref.chapter, "NKRV");
    const text = verses
      .filter((v) => v.verse >= ref.verseStart && v.verse <= ref.verseEnd)
      .map((v) => v.text)
      .join(" ");

    const book = getBook(ref.bookId);
    const unit = chapterUnit(ref.bookId);
    const label =
      ref.verseStart === ref.verseEnd
        ? `${book?.name} ${ref.chapter}${unit} ${ref.verseStart}절`
        : `${book?.name} ${ref.chapter}${unit} ${ref.verseStart}~${ref.verseEnd}절`;

    cards.push({ ref, label, text });
  }

  return cards;
}