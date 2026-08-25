"use client";

import BackButton from "@/components/common/BackButton";
import { searchHymns, type Hymn } from "@/lib/bible/hymn-types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function HymnListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId");
  const categoryName = searchParams.get("categoryName");

  const [allHymns, setAllHymns] = useState<Hymn[]>([]);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const query = categoryId ? `?categoryId=${categoryId}` : "";
    fetch(`/api/hymns${query}`)
      .then((res) => res.json())
      .then((data: { hymns: Hymn[] }) => setAllHymns(data.hymns));
  }, [categoryId]);

  const visibleHymns = searchHymns(allHymns, keyword);

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 truncate text-lg font-bold text-white">
          {categoryName ?? "찬송"}
        </h1>
        <button
          type="button"
          onClick={() => router.push("/bible/hymns/categories")}
          aria-label="분류"
          className="mr-2 flex h-9 w-9 cursor-pointer items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M3,3h8v8H3V3zM13,3h8v8h-8V3zM3,13h8v8H3v-8zM13,13h8v8h-8v-8z" />
          </svg>
        </button>
      </header>

      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="장 번호 또는 제목 검색"
        className="m-4 rounded-lg border border-divider p-3 text-base"
      />

      <ul className="flex flex-1 flex-col overflow-y-auto">
        {visibleHymns.map((hymn) => (
          <li key={hymn.number}>
            <Link
              href={`/bible/hymns/${hymn.number}`}
              className="flex cursor-pointer items-center gap-3 px-4 py-4"
            >
              <span className="w-10 shrink-0 text-center text-15 font-bold text-brown-primary">
                {hymn.number}
              </span>
              <span className="min-w-0 flex-1 truncate text-base text-text-primary">
                {hymn.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HymnListPage() {
  return (
    <Suspense fallback={null}>
      <HymnListInner />
    </Suspense>
  );
}
