"use client";

import type { SermonListRow } from "@/lib/actions/sermon/sermons";
import { getBook } from "@/lib/bible/bible-books";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Tab = "calendar" | "bybook" | "application";

export default function SermonTabsClient({ sermons }: { sermons: SermonListRow[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) ?? "calendar";

  function setTab(t: Tab) {
    router.push(`/sermons?tab=${t}`);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center bg-brown-primary px-4">
        <h1 className="flex-1 text-lg font-bold text-white">설교 · 적용</h1>
        <Link
          href="/sermons/new"
          aria-label="설교 추가"
          className="flex h-9 w-9 cursor-pointer items-center justify-center text-white"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </Link>
      </header>

      <div className="flex border-b border-divider">
        <SubTab label="캘린더" active={tab === "calendar"} onClick={() => setTab("calendar")} />
        <SubTab label="성경별" active={tab === "bybook"} onClick={() => setTab("bybook")} />
        <SubTab
          label="적용하기"
          active={tab === "application"}
          onClick={() => setTab("application")}
        />
      </div>

      {tab === "calendar" && <CalendarTabList sermons={sermons} />}
      {tab === "bybook" && <ByBookTabList sermons={sermons} />}
      {tab === "application" && (
        <p className="p-6 text-center text-text-secondary">
          적용노트는 마이페이지 도메인 만들 때 이어서 연결할게요.
        </p>
      )}
    </div>
  );
}

function SubTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 cursor-pointer border-b-2 py-3.5 text-center text-sm ${
        active ? "border-brown-primary font-bold text-brown-primary" : "border-transparent text-nav-unselected"
      }`}
    >
      {label}
    </button>
  );
}

function CalendarTabList({ sermons }: { sermons: SermonListRow[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const label = `${target.getFullYear()}년 ${target.getMonth() + 1}월`;
  const prefix = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
  const filtered = sermons
    .filter((s) => s.sermonDate.startsWith(prefix))
    .sort((a, b) => b.sermonDate.localeCompare(a.sermonDate));

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-center gap-6 py-3">
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m - 1)}
          className="cursor-pointer text-lg text-zinc-400"
        >
          ‹
        </button>
        <span className="text-[15px] font-bold text-text-primary">{label}</span>
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m + 1)}
          className="cursor-pointer text-lg text-zinc-400"
        >
          ›
        </button>
      </div>
      <SermonRows sermons={filtered} emptyText="이 달엔 작성한 설교노트가 없어요." />
    </div>
  );
}

function ByBookTabList({ sermons }: { sermons: SermonListRow[] }) {
  const grouped = new Map<number, SermonListRow[]>();
  for (const s of sermons) {
    if (s.firstBookId == null) continue;
    const list = grouped.get(s.firstBookId);
    if (list) list.push(s);
    else grouped.set(s.firstBookId, [s]);
  }
  const bookIds = [...grouped.keys()].sort((a, b) => a - b);

  if (bookIds.length === 0) {
    return (
      <p className="p-6 text-center text-text-secondary">본문 구절이 있는 설교노트가 없어요.</p>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {bookIds.map((bookId) => (
        <div key={bookId}>
          <p className="px-4 pb-1.5 pt-4 text-[13px] font-bold text-brown-primary">
            {getBook(bookId)?.name}
          </p>
          <SermonRows sermons={grouped.get(bookId)!} />
        </div>
      ))}
    </div>
  );
}

function SermonRows({ sermons, emptyText }: { sermons: SermonListRow[]; emptyText?: string }) {
  if (sermons.length === 0) {
    return emptyText ? (
      <p className="p-6 text-center text-text-secondary">{emptyText}</p>
    ) : null;
  }
  return (
    <ul className="flex flex-col">
      {sermons.map((sermon) => (
        <li key={sermon.id}>
          <Link
            href={`/sermons/${sermon.id}`}
            className="flex cursor-pointer items-center gap-3 px-4 py-3"
          >
            <span
              className="h-9 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: sermon.colorHex ?? "#B0BEC5" }}
            />
            <span className="flex-1 truncate text-[15px] text-text-primary">{sermon.title}</span>
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
  );
}