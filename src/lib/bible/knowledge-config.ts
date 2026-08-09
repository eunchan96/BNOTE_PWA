import { readFile } from "node:fs/promises";
import path from "node:path";
import "server-only";

export type KnowledgeItem = {
  id: string;
  name: string;
  otherNames?: string;
  category: string;
  subtitle?: string; // era 또는 region
  summary: string;
  description: string;
  keyBookId: number;
  keyChapter: number;
  keyVerseLabel: string;
};

export type CategorySlug = "figures" | "places" | "culture" | "units" | "parables";

const CONFIG: Record<
  CategorySlug,
  { title: string; file: string; categoryOrder: string[] }
> = {
  figures: {
    title: "인물사전",
    file: "bible_figures.json",
    categoryOrder: ["족장", "지도자", "사사", "왕", "선지자", "사도", "여성", "기타"],
  },
  places: {
    title: "지명사전",
    file: "bible_places.json",
    categoryOrder: ["도시", "지역", "산", "강", "바다", "나라"],
  },
  culture: {
    title: "당시 문화",
    file: "bible_culture.json",
    categoryOrder: ["가정", "신앙생활", "일상생활", "경제생활", "정치/사회"],
  },
  units: {
    title: "성경의 단위들",
    file: "bible_unit.json",
    categoryOrder: ["길이", "무게·화폐", "부피", "시간"],
  },
  parables: {
    title: "예수님의 비유와 이적",
    file: "parables_miracles.json",
    categoryOrder: ["비유", "이적"],
  },
};

export function isValidCategory(slug: string): slug is CategorySlug {
  return slug in CONFIG;
}

export function getCategoryTitle(slug: CategorySlug): string {
  return CONFIG[slug].title;
}

export function getCategoryOrder(slug: CategorySlug): string[] {
  return CONFIG[slug].categoryOrder;
}

const cache = new Map<CategorySlug, KnowledgeItem[]>();

export async function getKnowledgeItems(slug: CategorySlug): Promise<KnowledgeItem[]> {
  const cached = cache.get(slug);
  if (cached) return cached;

  const filePath = path.join(
    process.cwd(),
    "public",
    "knowledge-data",
    CONFIG[slug].file,
  );
  const raw = await readFile(filePath, "utf-8");
  const data = JSON.parse(raw) as Record<string, unknown>[];

  const items: KnowledgeItem[] = data.map((obj) => ({
    id: obj.id as string,
    name: (obj.name ?? obj.title) as string,
    otherNames: obj.otherNames as string | undefined,
    category: (obj.category ?? obj.type) as string,
    subtitle: (obj.era ?? obj.region) as string | undefined,
    summary: obj.summary as string,
    description: obj.description as string,
    keyBookId: obj.keyBookId as number,
    keyChapter: obj.keyChapter as number,
    keyVerseLabel: obj.keyVerseLabel as string,
  }));

  cache.set(slug, items);
  return items;
}

export async function getKnowledgeItem(
  slug: CategorySlug,
  id: string,
): Promise<KnowledgeItem | undefined> {
  const items = await getKnowledgeItems(slug);
  return items.find((i) => i.id === id);
}