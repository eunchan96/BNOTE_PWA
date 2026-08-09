"use client";

import BackButton from "@/components/BackButton";
import { deleteScrap, type ScrapRow } from "@/lib/actions/scraps";
import { getBook } from "@/lib/bible-books";
import Link from "next/link";
import { useState } from "react";

export default function ScrapDetailClient({
  groupId,
  groupName,
  initialScraps,
}: {
  groupId: number;
  groupName: string;
  initialScraps: ScrapRow[];
}) {
  const [scraps, setScraps] = useState(initialScraps);
  const [isEditMode, setIsEditMode] = useState(false);

  async function handleDelete(scrap: ScrapRow) {
    if (!confirm("이 스크랩을 삭제할까요?")) return;
    await deleteScrap(scrap.id, groupId);
    setScraps((prev) => prev.filter((s) => s.id !== scrap.id));
  }

  function handleCopy(scrap: ScrapRow) {
    const book = getBook(scrap.bookId);
    const ref =
      scrap.startVerse === scrap.endVerse
        ? `(${book?.name} ${scrap.chapter}:${scrap.startVerse})`
        : `(${book?.name} ${scrap.chapter}:${scrap.startVerse}~${scrap.endVerse})`;
    navigator.clipboard.writeText(`${ref} ${scrap.verseText.replace(/\n/g, " ")}`);
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 truncate text-lg font-bold text-white">
          {groupName}
        </h1>
        {scraps.length > 0 && (
          <button
            type="button"
            onClick={() => setIsEditMode((v) => !v)}
            className="mr-2 cursor-pointer px-2 text-sm text-white"
          >
            {isEditMode ? "완료" : "관리"}
          </button>
        )}
      </header>

      {scraps.length === 0 && (
        <p className="p-6 text-center text-text-secondary">
          이 그룹엔 스크랩한 구절이 없어요.
        </p>
      )}

      <ul className="flex flex-1 flex-col overflow-y-auto">
        {scraps.map((scrap) => {
          const book = getBook(scrap.bookId);
          const ref =
            scrap.startVerse === scrap.endVerse
              ? `${book?.name} ${scrap.chapter}:${scrap.startVerse}`
              : `${book?.name} ${scrap.chapter}:${scrap.startVerse}~${scrap.endVerse}`;

          return (
            <li key={scrap.id} className="flex items-start gap-2 border-b border-divider px-4 py-3">
              {isEditMode ? (
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-brown-primary">{ref}</p>
                  <p className="mt-1 whitespace-pre-line text-[15px] text-text-primary">
                    {scrap.verseText}
                  </p>
                </div>
              ) : (
                <Link
                  href={`/bible/${scrap.bookId}/${scrap.chapter}?verse=${scrap.startVerse}`}
                  className="flex-1 cursor-pointer"
                >
                  <p className="text-[13px] font-bold text-brown-primary">{ref}</p>
                  <p className="mt-1 whitespace-pre-line text-[15px] text-text-primary">
                    {scrap.verseText}
                  </p>
                </Link>
              )}

              {isEditMode ? (
                <button
                  type="button"
                  onClick={() => handleDelete(scrap)}
                  className="mt-0.5 shrink-0 cursor-pointer text-sm text-red-500"
                >
                  삭제
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCopy(scrap)}
                  aria-label="복사"
                  className="mt-0.5 shrink-0 cursor-pointer text-zinc-400"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16,1H4C2.9,1 2,1.9 2,3v14h2V3h12V1zM19,5H8C6.9,5 6,5.9 6,7v14c0,1.1 0.9,2 2,2h11c1.1,0 2,-0.9 2,-2V7C21,5.9 20.1,5 19,5zM19,21H8V7h11V21z" />
                  </svg>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}