"use client";

import { BIBLE_BOOKS } from "@/lib/bible/bible-books";
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
  removeSearchHistory,
} from "@/lib/bible/search-history";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type SearchResult = {
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
};

function shortNameOf(bookId: number): string {
  return BIBLE_BOOKS.find((b) => b.id === bookId)?.name.slice(0, 1) ?? "?";
  // 정확한 약칭이 필요하면 아래 SHORT_NAMES 참고
}

const SHORT_NAMES = [
  "창",
  "출",
  "레",
  "민",
  "신",
  "수",
  "삿",
  "룻",
  "삼상",
  "삼하",
  "왕상",
  "왕하",
  "대상",
  "대하",
  "스",
  "느",
  "에",
  "욥",
  "시",
  "잠",
  "전",
  "아",
  "사",
  "렘",
  "애",
  "겔",
  "단",
  "호",
  "욜",
  "암",
  "옵",
  "욘",
  "미",
  "나",
  "합",
  "습",
  "학",
  "슥",
  "말",
  "마",
  "막",
  "눅",
  "요",
  "행",
  "롬",
  "고전",
  "고후",
  "갈",
  "엡",
  "빌",
  "골",
  "살전",
  "살후",
  "딤전",
  "딤후",
  "딛",
  "몬",
  "히",
  "약",
  "벧전",
  "벧후",
  "요일",
  "요이",
  "요삼",
  "유",
  "계",
];

function BibleSearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const translation = searchParams.get("translation") ?? "NKRV";

  const [keyword, setKeyword] = useState("");
  const [history, setHistory] = useState<string[]>(() => getSearchHistory());
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [emptyMessage, setEmptyMessage] = useState("검색어를 입력해주세요");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const normalizedLength = keyword.replace(/\s/g, "").length;

    debounceRef.current = setTimeout(
      async () => {
        if (keyword === "") {
          setResults(null);
          setHistory(getSearchHistory());
          return;
        }

        if (normalizedLength < 2) {
          setResults(null);
          setEmptyMessage("2글자 이상 입력해주세요");
          return;
        }

        const res = await fetch(
          `/api/bible/search?translation=${translation}&keyword=${encodeURIComponent(keyword.trim())}`,
        );
        const data: { results: SearchResult[] } = await res.json();
        setResults(data.results);
        setEmptyMessage("검색 결과가 없어요");
      },
      keyword === "" ? 0 : 300,
    );

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [keyword, translation]);

  function goToResult(result: SearchResult) {
    addSearchHistory(keyword.trim());
    const secondary = searchParams.get("secondary");
    const suffix = secondary ? `&secondary=${secondary}` : "";
    router.push(
      `/bible/${result.bookId}/${result.chapter}?translation=${translation}&verse=${result.verse}${suffix}`,
    );
  }
  function pickHistory(word: string) {
    setKeyword(word);
    inputRef.current?.focus();
  }

  const showHistory = keyword === "" && history.length > 0;
  const showEmpty =
    keyword === ""
      ? history.length === 0
      : results === null || results.length === 0;

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="flex h-10 w-10 items-center justify-center cursor-pointer"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M15.41,7.41L14,6l-6,6 6,6 1.41,-1.41L10.83,12z" />
          </svg>
        </button>
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">성경 검색</h1>
      </header>

      <input
        ref={inputRef}
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") addSearchHistory(keyword);
        }}
        placeholder="검색어를 입력하세요"
        className="m-4 rounded-lg border border-divider p-3 text-base"
      />
      <div className="border-t border-divider" />

      {showEmpty && (
        <p className="p-6 text-center text-text-secondary">{emptyMessage}</p>
      )}

      {showHistory && (
        <div className="flex flex-col">
          <div className="mb-1 mt-3 flex items-center gap-1 pl-4 pr-2">
            <p className="flex-1 text-13 font-bold text-text-secondary">
              최근 검색어
            </p>
            <button
              type="button"
              onClick={() => {
                clearSearchHistory();
                setHistory([]);
              }}
              className="px-2 text-13 text-zinc-400 cursor-pointer"
            >
              전체 삭제
            </button>
          </div>
          {history.map((word) => (
            <div key={word} className="flex items-center gap-1 pl-4 pr-1">
              <button
                type="button"
                onClick={() => pickHistory(word)}
                className="flex-1 py-3 text-left text-15 text-text-primary cursor-pointer"
              >
                {word}
              </button>
              <button
                type="button"
                onClick={() => {
                  removeSearchHistory(word);
                  setHistory(getSearchHistory());
                }}
                aria-label="삭제"
                className="flex h-9 w-9 items-center justify-center text-zinc-400 cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {!showHistory && results !== null && results.length > 0 && (
        <ul className="flex flex-1 flex-col overflow-y-auto">
          {results.map((r) => (
            <li key={`${r.bookId}-${r.chapter}-${r.verse}`}>
              <button
                type="button"
                onClick={() => goToResult(r)}
                className="flex w-full gap-3 p-3 text-left cursor-pointer"
              >
                <span className="w-16 shrink-0 text-sm font-bold text-brown-primary">
                  {SHORT_NAMES[r.bookId - 1] ?? "?"} {r.chapter}:{r.verse}
                </span>
                <span className="flex-1 text-text-primary">{r.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BibleSearchPage() {
  return (
    <Suspense fallback={null}>
      <BibleSearchInner />
    </Suspense>
  );
}
