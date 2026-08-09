import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type GenealogyEntry = { name: string; relation: string; note?: string };
export type GenealogyChart = {
  id: string;
  title: string;
  description: string;
  entries: GenealogyEntry[];
  keyBookId: number;
  keyChapter: number;
  keyVerseLabel: string;
};

let cache: GenealogyChart[] | null = null;

async function load(): Promise<GenealogyChart[]> {
  if (cache) return cache;
  const filePath = path.join(
    process.cwd(),
    "public",
    "knowledge-data",
    "genealogy_charts.json",
  );
  const raw = await readFile(filePath, "utf-8");
  cache = JSON.parse(raw) as GenealogyChart[];
  return cache;
}

export async function getGenealogyCharts(): Promise<GenealogyChart[]> {
  return load();
}

export async function getGenealogyChart(id: string): Promise<GenealogyChart | undefined> {
  const charts = await load();
  return charts.find((c) => c.id === id);
}