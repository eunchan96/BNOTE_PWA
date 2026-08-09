"use client";

import { DeleteIconButton } from "@/components/common/ManageIconButtons";
import {
  removeBookmark,
  type BookmarkedVerseRow,
} from "@/lib/actions/bible/bookmarks";
import { getBook } from "@/lib/bible/bible-books";
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
              <DeleteIconButton onClick={() => handleDelete(row)} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
