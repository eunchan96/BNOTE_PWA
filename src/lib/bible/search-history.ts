"use client";

const STORAGE_KEY = "bnote:bible-search-history";
const MAX_HISTORY = 20;

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addSearchHistory(keyword: string) {
  const trimmed = keyword.trim();
  if (trimmed.replace(/\s/g, "").length < 2) return;

  const current = getSearchHistory().filter((k) => k !== trimmed);
  const next = [trimmed, ...current].slice(0, MAX_HISTORY);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function removeSearchHistory(keyword: string) {
  const next = getSearchHistory().filter((k) => k !== keyword);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearSearchHistory() {
  window.localStorage.removeItem(STORAGE_KEY);
}