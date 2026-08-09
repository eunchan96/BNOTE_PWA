"use client";

import {
  removeBookmark,
  type BookmarkedVerseRow,
} from "@/lib/actions/bookmarks";
import { getBook } from "@/lib/bible-books";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function BookmarkListClient({
  initialRows,
}: {
  initialRows: BookmarkedVerseRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [isEditMode, setIsEditMode] = useState(false);
  const [, startTransition] = useTransition();

  function goToVerse(row: BookmarkedVerseRow) {
    router.push(`/bible/${row.bookId}/${row.chapter}?verse=${row.verse}`);
  }

  function handleDelete(row: BookmarkedVerseRow) {
    startTransition(async () => {
      await removeBookmark(row.bookId, row.chapter, row.verse);
      setRows((prev) =>
        prev.filter(
          (r) =>
            !(
              r.bookId === row.bookId &&
              r.chapter === row.chapter &&
              r.verse === row.verse
            ),
        ),
      );
    });
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="flex h-14 items-center gap-1 bg-brown-primary pl-1">
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
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">북마크</h1>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={() => setIsEditMode((v) => !v)}
            className="px-3 text-sm text-white cursor-pointer"
          >
            {isEditMode ? "완료" : "관리"}
          </button>
        )}
      </header>

      {rows.length === 0 && (
        <p className="p-6 text-center text-text-secondary">
          북마크한 절이 없어요
        </p>
      )}

      <ul className="flex flex-1 flex-col overflow-y-auto">
        {rows.map((row) => (
          <li
            key={`${row.bookId}-${row.chapter}-${row.verse}`}
            className="flex items-center gap-1 pl-4 pr-1"
          >
            <button
              type="button"
              onClick={() => !isEditMode && goToVerse(row)}
              className="flex-1 py-3 text-left cursor-pointer"
            >
              <p className="text-[13px] font-bold text-brown-primary">
                {getBook(row.bookId)?.name} {row.chapter}:{row.verse}
              </p>
              <p className="mt-1 line-clamp-3 text-text-primary">{row.text}</p>
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={() => handleDelete(row)}
                aria-label="삭제"
                className="flex h-10 w-10 shrink-0 items-center justify-center text-zinc-400 cursor-pointer"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M6,19c0,1.1 0.9,2 2,2h8c1.1,0 2,-0.9 2,-2V7H6V19zM19,4h-3.5l-1,-1h-5l-1,1H5v2h14V4z" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
