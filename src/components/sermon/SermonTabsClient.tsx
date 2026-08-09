"use client";

import CalendarTab from "@/components/sermon/CalendarTab";
import type { SermonListRow } from "@/lib/actions/sermon/sermons";
import { getBook } from "@/lib/bible/bible-books";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Tab = "calendar" | "bybook" | "application";

export default function SermonTabsClient({
  sermons,
}: {
  sermons: SermonListRow[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) ?? "calendar";

  function setTab(t: Tab) {
    router.push(`/sermons?tab=${t}`);
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* 다른 화면들과 동일한 스타일의 공용 상단바 */}
      <header className="sticky top-0 z-10 flex h-14 items-center bg-brown-primary px-2">
        <h1 className="flex-1 truncate px-2 text-lg font-bold text-white">
          설교 · 적용
        </h1>
        <button
          type="button"
          aria-label="검색"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full opacity-90"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M15.5,14h-0.79l-0.28,-0.27C15.41,12.59 16,11.11 16,9.5 16,5.91 13.09,3 9.5,3S3,5.91 3,9.5 5.91,16 9.5,16c1.61,0 3.09,-0.59 4.23,-1.57l0.27,0.28v0.79l5,4.99L20.49,19l-4.99,-5zM9.5,14C7.01,14 5,11.99 5,9.5S7.01,5 9.5,5 14,7.01 14,9.5 11.99,14 9.5,14z" />
          </svg>
        </button>
        <Link
          href="/sermons/new"
          aria-label="설교 추가"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full opacity-90"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </Link>
      </header>

      <div className="flex border-b border-divider">
        <SubTab
          label="캘린더"
          active={tab === "calendar"}
          onClick={() => setTab("calendar")}
        />
        <SubTab
          label="성경별"
          active={tab === "bybook"}
          onClick={() => setTab("bybook")}
        />
        <SubTab
          label="적용하기"
          active={tab === "application"}
          onClick={() => setTab("application")}
        />
      </div>

      {tab === "calendar" && <CalendarTab sermons={sermons} />}
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
        active
          ? "border-brown-primary font-bold text-brown-primary"
          : "border-transparent text-nav-unselected"
      }`}
    >
      {label}
    </button>
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
      <p className="p-6 text-center text-text-secondary">
        본문 구절이 있는 설교노트가 없어요.
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {bookIds.map((bookId) => (
        <div key={bookId}>
          <p className="px-4 pb-1.5 pt-4 text-[13px] font-bold text-brown-primary">
            {getBook(bookId)?.name}
          </p>
          <ul className="flex flex-col">
            {grouped.get(bookId)!.map((sermon) => (
              <li key={sermon.id}>
                <Link
                  href={`/sermons/${sermon.id}`}
                  className="flex cursor-pointer items-center gap-3 p-3"
                >
                  <span
                    className="h-9 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: sermon.colorHex ?? "#B0BEC5" }}
                  />
                  <span className="flex-1 truncate text-[15px] text-text-primary">
                    {sermon.title}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {sermon.sermonDate}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
