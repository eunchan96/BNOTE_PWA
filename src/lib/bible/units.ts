import { readFile } from "node:fs/promises";
import path from "node:path";
import "server-only";

export type BibleUnit = {
  id: string;
  title: string;
  category: string;
  // 카테고리 안에서 더 세분화할 때만 쓰는 값 (예: "부피"의 "액체"/"마른 곡물").
  // 굳이 나눌 필요 없는 카테고리(무게, 시간)는 없음.
  subcategory?: string;
  summary: string;
  description: string;
  keyBookId: number;
  keyChapter: number;
  keyVerseLabel: string;
};

// 허브 화면에 보여줄 5개 카테고리, 이 순서 그대로.
export const UNIT_CATEGORIES = ["거리·길이", "무게", "부피", "화폐", "시간"];

const OLD_TESTAMENT_LAST_BOOK_ID = 39;

// 소제목이 붙을 때 화면에 보여줄 순서(원본 자료의 순서를 그대로 따름).
// 이 목록에 없는 subcategory 값이 나오면, 처음 등장한 순서대로 뒤에 붙는다.
const SUBCATEGORY_ORDER = [
  "거리",
  "길이",
  "액체",
  "마른 곡물",
  "무게를 달아 값을 치르는 경우의 단위(은화)",
  "무게를 달아 값을 치르는 경우의 단위(금화)",
  "주조화폐",
  "무게를 달아 값을 치르는 경우의 단위",
  "은화 단위",
  "동전 단위",
];

let cache: BibleUnit[] | null = null;

export async function getAllUnits(): Promise<BibleUnit[]> {
  if (cache) return cache;

  const filePath = path.join(
    process.cwd(),
    "public",
    "knowledge-data",
    "bible_unit.json",
  );
  const raw = await readFile(filePath, "utf-8");
  const data = JSON.parse(raw) as Record<string, unknown>[];

  cache = data.map((obj) => ({
    id: obj.id as string,
    title: obj.title as string,
    category: obj.category as string,
    subcategory: (obj.subcategory as string | null | undefined) ?? undefined,
    summary: obj.summary as string,
    description: obj.description as string,
    keyBookId: obj.keyBookId as number,
    keyChapter: obj.keyChapter as number,
    keyVerseLabel: obj.keyVerseLabel as string,
  }));

  return cache;
}

export async function getUnitsByCategory(category: string): Promise<BibleUnit[]> {
  const all = await getAllUnits();
  return all.filter((u) => u.category === category);
}

export async function getUnitById(id: string): Promise<BibleUnit | undefined> {
  const all = await getAllUnits();
  return all.find((u) => u.id === id);
}

export type UnitSubGroup = { subcategory: string | null; units: BibleUnit[] };
export type UnitEraGroup = { era: "구약" | "신약" | null; subGroups: UnitSubGroup[] };

/** 안드로이드 UnitCategoryListActivity.renderList/renderBySubcategory와 동일한 규칙:
 * 구약/신약이 둘 다 있을 때만 시대 소제목을 붙이고, 그 안에서 subcategory가 두 가지
 * 이상일 때만 subcategory 소제목을 붙인다. */
export function groupUnitsForDisplay(units: BibleUnit[]): UnitEraGroup[] {
  const oldTestament = units.filter((u) => u.keyBookId <= OLD_TESTAMENT_LAST_BOOK_ID);
  const newTestament = units.filter((u) => u.keyBookId > OLD_TESTAMENT_LAST_BOOK_ID);

  if (oldTestament.length > 0 && newTestament.length > 0) {
    return [
      { era: "구약", subGroups: subcategorize(oldTestament) },
      { era: "신약", subGroups: subcategorize(newTestament) },
    ];
  }
  return [{ era: null, subGroups: subcategorize(units) }];
}

function subcategorize(units: BibleUnit[]): UnitSubGroup[] {
  const distinctSubcategories = [...new Set(units.map((u) => u.subcategory).filter(Boolean))];
  if (distinctSubcategories.length <= 1) {
    return [{ subcategory: null, units }];
  }

  const grouped = new Map<string, BibleUnit[]>();
  for (const u of units) {
    const key = u.subcategory ?? "";
    const list = grouped.get(key);
    if (list) list.push(u);
    else grouped.set(key, [u]);
  }

  const orderedKeys = [...grouped.keys()].sort((a, b) => {
    const ai = SUBCATEGORY_ORDER.indexOf(a);
    const bi = SUBCATEGORY_ORDER.indexOf(b);
    return (ai >= 0 ? ai : SUBCATEGORY_ORDER.length) - (bi >= 0 ? bi : SUBCATEGORY_ORDER.length);
  });

  return orderedKeys.map((key) => ({
    subcategory: key || null,
    units: grouped.get(key)!,
  }));
}