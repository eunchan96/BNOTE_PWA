export type HymnCategory = {
  id: number;
  name: string;
  majorId?: number;
  sortOrder: number;
};

export type Hymn = {
  number: number;
  title: string;
  categoryId: number;
  image: string;
  youtubeSong: string;
  youtubeMr: string;
};

export type HymnData = {
  majorCategories: HymnCategory[];
  minorCategories: HymnCategory[];
  hymns: Hymn[];
};

export function formatRangeLabel(hymns: Hymn[]): string {
  if (hymns.length === 0) return "";
  const numbers = hymns.map((h) => h.number);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return min === max ? `(${min})` : `(${min}~${max})`;
}

export function searchHymns(hymns: Hymn[], keyword: string): Hymn[] {
  const normalized = keyword.replace(/\s/g, "");
  if (normalized === "") return hymns;
  return hymns.filter(
    (h) =>
      h.number.toString().includes(normalized) ||
      h.title.replace(/\s/g, "").includes(normalized),
  );
}

/** youtube.com/watch?v=ID, youtu.be/ID, live/shorts 형식 모두 지원 (안드로이드와 동일 규칙). */
export function extractYoutubeId(url: string): string | null {
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watch) return watch[1];

  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (short) return short[1];

  const liveOrShorts = url.match(/youtube\.com\/(?:live|shorts)\/([a-zA-Z0-9_-]{6,})/);
  if (liveOrShorts) return liveOrShorts[1];

  return null;
}