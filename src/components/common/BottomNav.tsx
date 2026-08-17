"use client";

import { getBook, nextChapter, previousChapter } from "@/lib/bible/bible-books";
import {
  getCurrentBibleLocation,
  subscribeCurrentBibleLocation,
  type BibleLocation,
} from "@/lib/bible/current-location-store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const NAV_ITEMS = [
  { href: "/bible", key: "bible" as const },
  { href: "/sermons", key: "sermon" as const },
  { href: "/mypage", key: "mypage" as const },
];

const CHAPTER_PATH = /^\/bible\/(\d+)\/(\d+)/;

export default function BottomNav() {
  const pathname = usePathname();

  // 성경 읽기 셸(BibleChapterShell)이 클라이언트에서 장을 옮기면 주소창은
  // history.pushState로만 바뀌어서 usePathname()이 못 따라간다. 그래서 셸이
  // 직접 알려주는 저장소를 구독해서, 있으면 그 값을 최우선으로 쓴다.
  const shellLocation = useSyncExternalStore(
    subscribeCurrentBibleLocation,
    getCurrentBibleLocation,
    () => null,
  );

  if (
    pathname === "/login" ||
    pathname === "/bible/search" ||
    pathname === "/bible/bookmarks" ||
    pathname.startsWith("/bible/highlights") ||
    pathname.startsWith("/bible/scraps") ||
    pathname === "/bible/memos" ||
    /^\/bible\/\d+\/\d+\/sermons$/.test(pathname)
  ) {
    return null;
  }

  // 셸이 떠 있으면(성경 읽기 화면) 그 값을 쓰고, 없으면(아직 마운트 전 등)
  // 주소창에서 직접 읽는다.
  let location: BibleLocation = shellLocation;
  if (!location) {
    const chapterMatch = pathname.match(CHAPTER_PATH);
    if (chapterMatch) {
      location = {
        bookId: Number(chapterMatch[1]),
        chapter: Number(chapterMatch[2]),
        translation: "NKRV",
      };
    }
  }

  let prevDest: { bookId: number; chapter: number } | null = null;
  let nextDest: { bookId: number; chapter: number } | null = null;
  if (location && getBook(location.bookId)) {
    prevDest = previousChapter(location.bookId, location.chapter);
    nextDest = nextChapter(location.bookId, location.chapter);
  }

  function goToChapter(direction: "prev" | "next") {
    window.__bnoteBibleShellNavigate?.(direction);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 h-[52px] border-t border-divider bg-white">
      <div className="mx-auto flex h-full max-w-2xl items-center pl-1 pr-4">
        <IconButton
          onClick={() => goToChapter("prev")}
          disabled={!prevDest}
          label="이전 장"
        >
          <ChevronLeftIcon />
        </IconButton>
        <IconButton
          onClick={() => goToChapter("next")}
          disabled={!nextDest}
          label="다음 장"
        >
          <ChevronRightIcon />
        </IconButton>

        <div className="flex-1" />

        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.key}
              className="flex h-10 w-10 items-center justify-center rounded-full ml-3"
            >
              <TabIcon tab={item.key} active={isActive} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function IconButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="h-10 w-10" />;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
    >
      {children}
    </button>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#795548">
      <path d="M15.41,7.41L14,6l-6,6 6,6 1.41,-1.41L10.83,12z" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#795548">
      <path d="M8.59,16.59L10,18l6,-6 -6,-6 -1.41,1.41L13.17,12z" />
    </svg>
  );
}

function TabIcon({
  tab,
  active,
}: {
  tab: "bible" | "sermon" | "mypage";
  active: boolean;
}) {
  const color = active ? "#795548" : "#9E9E9E";

  if (tab === "bible") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
        <path d="M12,21.5c-1.36,-1.09 -3.13,-1.62 -4.9,-1.62 -1.44,0 -2.89,0.35 -4.15,1.06 -0.11,0.06 -0.16,0.07 -0.24,0.07 -0.29,0 -0.46,-0.24 -0.46,-0.5V6.05c0,-0.23 0.13,-0.43 0.32,-0.53C4.06,4.65 5.68,4.25 7.1,4.25c1.77,0 3.54,0.53 4.9,1.62V21.5zM12,21.5V5.87c1.36,-1.09 3.13,-1.62 4.9,-1.62 1.42,0 3.04,0.4 4.53,1.27 0.19,0.1 0.32,0.3 0.32,0.53v14.46c0,0.26 -0.17,0.5 -0.46,0.5 -0.08,0 -0.13,-0.01 -0.24,-0.07 -1.26,-0.71 -2.71,-1.06 -4.15,-1.06 -1.77,0 -3.54,0.53 -4.9,1.62z" />
      </svg>
    );
  }
  if (tab === "sermon") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
        <path d="M3,17.25V21h3.75L17.81,9.94l-3.75,-3.75L3,17.25zM20.71,7.04c0.39,-0.39 0.39,-1.02 0,-1.41l-2.34,-2.34c-0.39,-0.39 -1.02,-0.39 -1.41,0l-1.83,1.83 3.75,3.75 1.83,-1.83z" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
      <path d="M12,12c2.21,0 4,-1.79 4,-4s-1.79,-4 -4,-4 -4,1.79 -4,4 1.79,4 4,4zM12,14c-2.67,0 -8,1.34 -8,4v2h16v-2c0,-2.66 -5.33,-4 -8,-4z" />
    </svg>
  );
}
