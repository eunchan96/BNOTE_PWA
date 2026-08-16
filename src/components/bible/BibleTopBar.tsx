"use client";

import BibleLocationPicker from "@/components/bible/BibleLocationPicker";
import BibleMenuDrawer from "@/components/bible/BibleMenuDrawer";
import TranslationPickerSheet from "@/components/bible/TranslationPickerSheet";
import {
  isChapterRead,
  toggleChapterRead,
} from "@/lib/actions/bible/reading-progress";
import { getSermonsForChapter } from "@/lib/actions/sermon/sermons";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

export default function BibleTopBar({
  bookId,
  chapter,
  title,
  translation,
  secondary,
  isLoggedIn,
  readingPlanEnabled,
  autoScrollEnabled,
  scrollSpeed = 3,
}: {
  bookId: number;
  chapter: number;
  title: string;
  translation: string;
  secondary?: string;
  isLoggedIn?: boolean;
  readingPlanEnabled?: boolean;
  autoScrollEnabled?: boolean;
  scrollSpeed?: number;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [autoScrollSession, setAutoScrollSession] = useState<{
    key: string;
    active: boolean;
  } | null>(null);
  const [sermonResult, setSermonResult] = useState<{
    key: string;
    hasSermon: boolean;
  } | null>(null);
  const [readResult, setReadResult] = useState<{
    key: string;
    isRead: boolean;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  // 장/절이 바뀌면(다른 화면으로 이동하면) 자동스크롤은 항상 꺼진 것으로 취급한다 -
  // 안드로이드도 onBiblePageSettled에서 changed일 때 stopAutoScroll()을 호출하는 것과 동일.
  // key가 지금 장과 일치할 때만 active 값을 인정하는 방식이라, effect에서 동기적으로
  // setState를 호출할 필요가 없다.
  const isAutoScrolling =
    autoScrollSession?.key === `${bookId}-${chapter}` &&
    autoScrollSession.active;

  function toggleAutoScroll() {
    setAutoScrollSession({
      key: `${bookId}-${chapter}`,
      active: !isAutoScrolling,
    });
  }

  // 실제 스크롤 루프. setInterval + 1px 점프 방식은 느린 속도일수록 초당 갱신 횟수가
  // 적어져(예: 속도 1은 초당 8번) 사람 눈에 뚝뚝 끊겨 보인다("지지직"거리는 느낌).
  // 그래서 화면 주사율에 맞춰 매 프레임 미세한 소수점 단위로 움직이는
  // requestAnimationFrame 방식으로 바꿔서 항상 매끄럽게 움직이도록 한다.
  // 속도 1~5에 대응하는 목표 속도(초당 px) - 나중에 실기기에서 느낌 보고 이 표만 조절하면 된다.
  const SPEED_TO_PX_PER_SEC: Record<number, number> = {
    1: 2,
    2: 4,
    3: 7,
    4: 12,
    5: 20,
  };
  useEffect(() => {
    if (!isAutoScrolling) return;
    const container = document.getElementById("bible-scroll-container");
    const content = document.getElementById("bible-scroll-content");
    if (!container || !content) return;
    const pxPerSec = SPEED_TO_PX_PER_SEC[scrollSpeed] ?? SPEED_TO_PX_PER_SEC[3];

    // scrollTop을 프레임마다 같이 건드리면, 정수 경계를 넘는 순간 레이아웃(scrollTop)과
    // 컴포지터(transform) 렌더링 타이밍이 완벽히 안 맞아서 미세하게 어긋나 보인다.
    // 그래서 애니메이션 도중에는 scrollTop을 전혀 건드리지 않고, 본문과 스크롤바 썸을
    // 모두 transform으로만 움직인다(네이티브 스크롤바는 CustomScrollbar가 숨겨둔 상태).
    // 손가락 스크롤 중에는 CustomScrollbar의 scroll 리스너가 썸을 갱신하고, 자동스크롤
    // 중에는 여기서 같은 rAF 루프 안에서 직접 갱신해 완전히 같은 타이밍으로 맞춘다.
    const baseScrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const maxScrollTop = Math.max(1, scrollHeight - clientHeight);
    const thumbHeight = Math.max(
      24,
      (clientHeight / scrollHeight) * clientHeight,
    );
    const maxThumbTravel = clientHeight - thumbHeight;
    const thumb = document.getElementById("bible-scroll-thumb");
    content.style.willChange = "transform";

    let rafId: number;
    let lastTime: number | null = null;
    let traveled = 0;

    function step(time: number) {
      if (lastTime !== null) {
        const deltaSeconds = (time - lastTime) / 1000;
        traveled += pxPerSec * deltaSeconds;
        content!.style.transform = `translateY(${-traveled}px)`;

        if (thumb) {
          const currentScrollTop = Math.min(
            maxScrollTop,
            baseScrollTop + traveled,
          );
          const ratio = currentScrollTop / maxScrollTop;
          thumb.style.transform = `translateY(${ratio * maxThumbTravel}px)`;
        }
      }
      lastTime = time;
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      content.style.transform = "";
      content.style.willChange = "";
      container.scrollTop = Math.round(baseScrollTop + traveled);
    };
  }, [isAutoScrolling, scrollSpeed]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    getSermonsForChapter(bookId, chapter).then((sermons) => {
      if (cancelled) return;
      setSermonResult({
        key: `${bookId}-${chapter}`,
        hasSermon: sermons.length > 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [bookId, chapter, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !readingPlanEnabled) return;
    let cancelled = false;
    isChapterRead(bookId, chapter).then((read) => {
      if (cancelled) return;
      setReadResult({ key: `${bookId}-${chapter}`, isRead: read });
    });
    return () => {
      cancelled = true;
    };
  }, [bookId, chapter, isLoggedIn, readingPlanEnabled]);

  // 아직 새 장에 대한 fetch가 끝나기 전(또는 로그아웃 상태)에는 이전 장의 결과를
  // 그대로 쓰지 않도록, key가 지금 장과 일치할 때만 아이콘을 켠다.
  const hasSermon =
    sermonResult?.key === `${bookId}-${chapter}` && sermonResult.hasSermon;
  const isRead =
    readResult?.key === `${bookId}-${chapter}` && readResult.isRead;

  function handleReadingPlanCheckClick() {
    if (!isLoggedIn) return;
    startTransition(async () => {
      const next = await toggleChapterRead(bookId, chapter);
      setReadResult({ key: `${bookId}-${chapter}`, isRead: next });
    });
  }

  return (
    <header className="scrollbar-hide flex h-14 items-center overflow-x-auto overscroll-x-contain bg-brown-primary px-2">
      <button
        type="button"
        onClick={() => setIsPickerOpen(true)}
        aria-label="대역본 선택"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full opacity-90 cursor-pointer"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M21,5c-1.11,-0.35 -2.33,-0.5 -3.5,-0.5c-1.95,0 -4.05,0.4 -5.5,1.5c-1.45,-1.1 -3.55,-1.5 -5.5,-1.5S2.45,4.9 1,6v14.65c0,0.25 0.25,0.5 0.5,0.5c0.1,0 0.15,-0.05 0.25,-0.05C3.1,20.45 5.05,20 6.5,20c1.95,0 4.05,0.4 5.5,1.5c1.35,-0.85 3.8,-1.5 5.5,-1.5c1.65,0 3.35,0.3 4.75,1.05c0.1,0.05 0.15,0.05 0.25,0.05c0.25,0 0.5,-0.25 0.5,-0.5V6C22.4,5.55 21.75,5.25 21,5z M21,18.5c-1.1,-0.35 -2.3,-0.5 -3.5,-0.5c-1.7,0 -4.15,0.65 -5.5,1.5V8c1.35,-0.85 3.8,-1.5 5.5,-1.5c1.2,0 2.4,0.15 3.5,0.5V18.5z" />
        </svg>
      </button>

      <div className="ml-2">
        <BibleLocationPicker
          bookId={bookId}
          title={title}
          translation={translation}
          secondary={secondary}
        />
      </div>

      {hasSermon && (
        <Link
          href={`/bible/${bookId}/${chapter}/sermons`}
          aria-label="이 장의 설교 보기"
          className="ml-3.5 shrink-0 opacity-90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M14,2H6c-1.1,0 -1.99,0.9 -1.99,2L4,20c0,1.1 0.89,2 1.99,2H18c1.1,0 2,-0.9 2,-2V8l-6,-6zM13,9V3.5L18.5,9H13zM8,13h8v2H8v-2zM8,17h8v2H8v-2zM8,9h3v2H8V9z" />
          </svg>
        </Link>
      )}

      {readingPlanEnabled && (
        <button
          type="button"
          onClick={handleReadingPlanCheckClick}
          disabled={isPending}
          aria-label="성경읽기표 완료 체크"
          className="ml-2 shrink-0 cursor-pointer"
          style={{ opacity: isRead ? 1 : 0.4 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
            <path d="M9,16.17L4.83,12l-1.42,1.41L9,19 21,7l-1.41,-1.41z" />
          </svg>
        </button>
      )}

      <div className="flex-1" />

      {autoScrollEnabled && (
        <button
          type="button"
          onClick={toggleAutoScroll}
          aria-label="자동 스크롤"
          className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full opacity-90 cursor-pointer"
        >
          {isAutoScrolling ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
              <path d="M6,19h4V5H6V19zM14,5v14h4V5H14z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
              <path d="M8,5v14l11,-7z" />
            </svg>
          )}
        </button>
      )}

      <Link
        href={`/bible/search?translation=${translation}${secondary ? `&secondary=${secondary}` : ""}`}
        aria-label="검색"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full opacity-90"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M15.5,14h-0.79l-0.28,-0.27C15.41,12.59 16,11.11 16,9.5 16,5.91 13.09,3 9.5,3S3,5.91 3,9.5 5.91,16 9.5,16c1.61,0 3.09,-0.59 4.23,-1.57l0.27,0.28v0.79l5,4.99L20.49,19l-4.99,-5zM9.5,14C7.01,14 5,11.99 5,9.5S7.01,5 9.5,5 14,7.01 14,9.5 11.99,14 9.5,14z" />
        </svg>
      </Link>
      <Link
        href="/bible/bookmarks"
        aria-label="북마크"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full opacity-90"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M17,3H7c-1.1,0 -2,0.9 -2,2v16l7,-3 7,3V5c0,-1.1 -0.9,-2 -2,-2z" />
        </svg>
      </Link>
      <button
        type="button"
        onClick={() => setIsMenuOpen(true)}
        aria-label="메뉴"
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-90"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M3,18h18v-2H3v2zM3,13h18v-2H3v2zM3,6v2h18V6H3z" />
        </svg>
      </button>

      {isPickerOpen && (
        <TranslationPickerSheet
          bookId={bookId}
          chapter={chapter}
          translation={translation}
          secondary={secondary}
          onClose={() => setIsPickerOpen(false)}
        />
      )}

      {isMenuOpen && (
        <BibleMenuDrawer
          readingPlanEnabled={Boolean(readingPlanEnabled)}
          autoScrollEnabled={Boolean(autoScrollEnabled)}
          onClose={() => setIsMenuOpen(false)}
        />
      )}
    </header>
  );
}

function TopBarIconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full opacity-90 cursor-pointer"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
        {children}
      </svg>
    </button>
  );
}
