import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type TimelineEvent = {
  id: string;
  era: string;
  period: string;
  title: string;
  description: string;
  keyBookId: number;
  keyChapter: number;
  keyVerseLabel: string;
};

let cache: TimelineEvent[] | null = null;

export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  if (cache) return cache;
  const filePath = path.join(
    process.cwd(),
    "public",
    "knowledge-data",
    "bible_timeline.json",
  );
  const raw = await readFile(filePath, "utf-8");
  cache = JSON.parse(raw) as TimelineEvent[];
  return cache;
}