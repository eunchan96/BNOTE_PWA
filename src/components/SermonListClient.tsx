"use client";

import type { SermonListRow } from "@/lib/actions/sermons";
import Link from "next/link";
import { useState } from "react";

export default function SermonListClient({ sermons }: { sermons: SermonListRow[] }) {
  const [sortMode, setSortMode] = useState<"date" | "added">("date");

  const sorted = [...sermons].sort((a, b) => {
    if (sortMode === "date") return b.sermonDate.localeCompare(a.sermonDate);
    return a.id - b.id;
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => setSortMode((m) => (m === "date" ? "added" : "date"))}
          className="cursor-pointer text-sm text-text-secondary"
        >
          {sortMode === "date" ? "날짜순" : "추가순"} ▾
        </button>
        <Link
          href="/sermons/new"
          className="cursor-pointer rounded-full bg-brown-primary px-4 py-2 text-sm text-white"
        >
          + 설교 추가
        </Link>
      </div>

      {sorted.length === 0 && (
        <p className="p-6 text-center text-text-secondary">아직 작성한 설교노트가 없어요.</p>
      )}

      <ul className="flex flex-1 flex-col overflow-y-auto">
        {sorted.map((sermon) => (
          <li key={sermon.id}>
            <Link
              href={`/sermons/${sermon.id}`}
              className="flex cursor-pointer items-center gap-3 px-4 py-3"
            >
              <span
                className="h-9 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: sermon.colorHex ?? "#B0BEC5" }}
              />
              <span className="flex-1 truncate text-[15px] text-text-primary">
                {sermon.title}
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="text-xs text-zinc-400">{sermon.sermonDate}</span>
                {sermon.refLabel && (
                  <span className="mt-0.5 text-xs text-brown-primary">{sermon.refLabel}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}