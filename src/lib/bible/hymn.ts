import type { Hymn, HymnCategory, HymnData } from "@/lib/bible/hymn-types";
import { readFile } from "node:fs/promises";
import path from "node:path";
import "server-only";

export { extractYoutubeId, formatRangeLabel, searchHymns } from "@/lib/bible/hymn-types";
export type { Hymn, HymnCategory } from "@/lib/bible/hymn-types";

let cache: HymnData | null = null;

async function loadHymnData(): Promise<HymnData> {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), "public", "hymn-data", "hymns.json");
  const raw = await readFile(filePath, "utf-8");
  const data = JSON.parse(raw) as HymnData;
  cache = data;
  return data;
}

export async function getMajorCategories(): Promise<HymnCategory[]> {
  const data = await loadHymnData();
  return [...data.majorCategories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getMinorCategories(majorId: number): Promise<HymnCategory[]> {
  const data = await loadHymnData();
  return data.minorCategories
    .filter((c) => c.majorId === majorId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getMajorCategory(id: number): Promise<HymnCategory | undefined> {
  const data = await loadHymnData();
  return data.majorCategories.find((c) => c.id === id);
}

export async function getAllHymns(): Promise<Hymn[]> {
  const data = await loadHymnData();
  return [...data.hymns].sort((a, b) => a.number - b.number);
}

export async function getHymnsByCategory(categoryId: number): Promise<Hymn[]> {
  const data = await loadHymnData();
  return data.hymns
    .filter((h) => h.categoryId === categoryId)
    .sort((a, b) => a.number - b.number);
}

export async function getHymnByNumber(number: number): Promise<Hymn | undefined> {
  const data = await loadHymnData();
  return data.hymns.find((h) => h.number === number);
}