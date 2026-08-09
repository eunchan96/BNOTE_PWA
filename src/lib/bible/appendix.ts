import { readFile } from "node:fs/promises";
import path from "node:path";

export type TextVersion = { id: string; label: string; lines: string[] };
export type VersionedTextContent = { title: string; versions: TextVersion[] };

export type CommandmentItem = { number: number; text: string };
export type CommandmentSummary = { text: string; reference: string };
export type TenCommandmentsContent = {
  title: string;
  intro: string[];
  commandments: CommandmentItem[];
  reference: string;
  summary: CommandmentSummary;
};

export type ReadingSpeaker = "leader" | "congregation" | "unison";
export type ResponsiveReadingLine = { speaker: ReadingSpeaker; text: string };
export type ResponsiveReading = {
  number: number;
  title: string;
  lines: ResponsiveReadingLine[];
};

async function readAppendixJson<T>(fileName: string): Promise<T> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "appendix-data",
    fileName,
  );
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

let lordsPrayerCache: VersionedTextContent | null = null;
let apostlesCreedCache: VersionedTextContent | null = null;
let tenCommandmentsCache: TenCommandmentsContent | null = null;
let responsiveReadingsCache: ResponsiveReading[] | null = null;

export async function loadLordsPrayer(): Promise<VersionedTextContent> {
  if (lordsPrayerCache) return lordsPrayerCache;
  const content = await readAppendixJson<VersionedTextContent>("lords_prayer.json");
  lordsPrayerCache = content;
  return content;
}

export async function loadApostlesCreed(): Promise<VersionedTextContent> {
  if (apostlesCreedCache) return apostlesCreedCache;
  const content = await readAppendixJson<VersionedTextContent>("apostles_creed.json");
  apostlesCreedCache = content;
  return content;
}

export async function loadTenCommandments(): Promise<TenCommandmentsContent> {
  if (tenCommandmentsCache) return tenCommandmentsCache;
  const content = await readAppendixJson<TenCommandmentsContent>("ten_commandments.json");
  tenCommandmentsCache = content;
  return content;
}

function normalizeSpeaker(value: string): ReadingSpeaker {
  if (value === "congregation") return "congregation";
  if (value === "unison") return "unison";
  return "leader";
}

export async function loadResponsiveReadings(): Promise<ResponsiveReading[]> {
  if (responsiveReadingsCache) return responsiveReadingsCache;

  const raw = await readAppendixJson<
    { number: number; title: string; lines: { speaker: string; text: string }[] }[]
  >("responsive_readings.json");

  const readings = raw.map((r) => ({
    number: r.number,
    title: r.title,
    lines: r.lines.map((l) => ({
      speaker: normalizeSpeaker(l.speaker),
      text: l.text,
    })),
  }));

  responsiveReadingsCache = readings;
  return readings;
}