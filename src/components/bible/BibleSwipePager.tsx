"use client";

import ChapterPeekPanel from "@/components/bible/ChapterPeekPanel";
import {
  getChapterPeek,
  type ChapterPeek,
} from "@/lib/actions/bible/chapter-peek";
import { nextChapter, previousChapter } from "@/lib/bible/bible-books";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * 안드로이드 ViewPager2처럼 옆 장의 실제 내용을 미리 가져와 화면 밖(좌우)에 대기시켜
 * 두고, 스와이프하면 그 준비된 내용이 바로 따라오게 한다. 놓아서 전환이 확정되면
 * 실제 라우트로 이동하는데, 이미 prefetch해둔 페이지라 거의 바로 이어진다.
 *
 * #bible-swipe-viewport(고정 크기, overflow-hidden, 클리핑 담당)
 *   └ #bible-swipe-track(prev 미리보기 | children(실제 인터랙티브 콘텐츠) | next 미리보기)
 * 드래그 중에는 track에만 transform을 건다 - viewport 자체는 움직이지 않는다.
 */
export default function BibleSwipePager({
  bookId,
  chapter,
  translation,
  secondary,
  currentTitle,
  children,
}: {
  bookId: number;
  chapter: number;
  translation: string;
  secondary?: string;
  currentTitle: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const prev = previousChapter(bookId, chapter);
  const next = nextChapter(bookId, chapter);
  const prevKey = prev ? `${prev.bookId}-${prev.chapter}` : null;
  const nextKey = next ? `${next.bookId}-${next.chapter}` : null;

  const [prevPeekResult, setPrevPeekResult] = useState<{
    key: string;
    peek: ChapterPeek | null;
  } | null>(null);
  const [nextPeekResult, setNextPeekResult] = useState<{
    key: string;
    peek: ChapterPeek | null;
  } | null>(null);

  // 지금 필요한 장(prevKey/nextKey)과 fetch 결과의 key가 일치할 때만 쓴다 -
  // 장이 빠르게 연속으로 바뀌어도 예전 장의 결과가 잘못 쓰이지 않는다.
  const prevPeek = prevPeekResult?.key === prevKey ? prevPeekResult.peek : null;
  const nextPeek = nextPeekResult?.key === nextKey ? nextPeekResult.peek : null;

  const prevHrefRef = useRef<string | null>(null);
  const nextHrefRef = useRef<string | null>(null);
  const prevPeekRef = useRef<ChapterPeek | null>(null);
  const nextPeekRef = useRef<ChapterPeek | null>(null);
  useEffect(() => {
    prevPeekRef.current = prevPeek;
  }, [prevPeek]);
  useEffect(() => {
    nextPeekRef.current = nextPeek;
  }, [nextPeek]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (translation) params.set("translation", translation);
    if (secondary) params.set("secondary", secondary);
    const suffix = params.toString() ? `?${params.toString()}` : "";

    prevHrefRef.current = prev
      ? `/bible/${prev.bookId}/${prev.chapter}${suffix}`
      : null;
    nextHrefRef.current = next
      ? `/bible/${next.bookId}/${next.chapter}${suffix}`
      : null;

    if (prev && prevKey) {
      getCachedChapterPeek(
        prev.bookId,
        prev.chapter,
        translation,
        secondary,
      ).then((peek) => setPrevPeekResult({ key: prevKey, peek }));
      if (prevHrefRef.current) router.prefetch(prevHrefRef.current);

      // 한두 걸음 더 앞(±3)도 미리 캐시에 데워둔다 - 화면엔 안 보이지만, 손가락으로
      // 연속해서 빠르게 넘길 때(마우스 드래그보다 훨씬 빠름) 캐시가 못 따라가서 빈
      // 화면이 잠깐 뜨는 걸 줄이기 위함.
      let cursor = prev;
      for (let i = 0; i < 2; i++) {
        const further = previousChapter(cursor.bookId, cursor.chapter);
        if (!further) break;
        getCachedChapterPeek(
          further.bookId,
          further.chapter,
          translation,
          secondary,
        );
        cursor = further;
      }
    }
    if (next && nextKey) {
      getCachedChapterPeek(
        next.bookId,
        next.chapter,
        translation,
        secondary,
      ).then((peek) => setNextPeekResult({ key: nextKey, peek }));
      if (nextHrefRef.current) router.prefetch(nextHrefRef.current);

      let cursor = next;
      for (let i = 0; i < 2; i++) {
        const further = nextChapter(cursor.bookId, cursor.chapter);
        if (!further) break;
        getCachedChapterPeek(
          further.bookId,
          further.chapter,
          translation,
          secondary,
        );
        cursor = further;
      }
    }
  }, [bookId, chapter, translation, secondary, router]);

  useEffect(() => {
    const track = document.getElementById("bible-swipe-track");
    const titleEl = document.getElementById("bible-location-title");
    if (!track) return;

    const THRESHOLD_RATIO = 0.25;
    const VELOCITY_THRESHOLD = 0.5;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let currentX = 0;
    let dragging = false;
    let horizontalLock: boolean | null = null;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;

      const target = e.target as Element | null;

      // 자체적으로 가로 스크롤되는 영역(선택 툴바 등, data-no-swipe-nav로 표시) 위에서
      // 시작한 터치는 장 넘기기 스와이프에서 제외한다 - 안 그러면 툴바를 좌우로 밀려는
      // 제스처를 "장 넘기기"로 오인해서 툴바의 가로 스크롤 자체가 막혀버린다.
      if (target?.closest("[data-no-swipe-nav]")) {
        dragging = false;
        horizontalLock = null;
        return;
      }

      // 이미 진행 중인 텍스트 선택(길게 눌러 선택 핸들이 나온 뒤, 그 핸들을 드래그해서
      // 범위를 넓히는 중)이면 스와이프를 비활성화한다 - 그 상태에서 preventDefault를
      // 걸면 선택 확장 자체가 막혀서 선택 툴바가 안 뜨게 된다. 길게 누르지 않고 그냥
      // 미는 일반적인 스와이프는 이 시점에 선택된 텍스트가 없으므로 영향받지 않는다.
      if (window.getSelection()?.toString()) {
        dragging = false;
        horizontalLock = null;
        return;
      }

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = performance.now();
      currentX = 0;
      dragging = true;
      horizontalLock = null;
      track!.style.transition = "";
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragging) return;

      // 드래그 도중에 텍스트 선택이 새로 시작됐다면(길게 눌러 선택 핸들이 나타남)
      // 스와이프를 즉시 취소하고 제자리로 되돌려서 선택 동작을 방해하지 않는다.
      if (window.getSelection()?.toString()) {
        dragging = false;
        horizontalLock = null;
        track!.style.transition = "transform 150ms ease-out";
        track!.style.transform = "translateX(0px)";
        return;
      }

      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (horizontalLock === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        horizontalLock = Math.abs(dx) > Math.abs(dy);
        if (!horizontalLock) {
          dragging = false;
          return;
        }
      }
      if (!horizontalLock) return;

      let clamped = dx;
      if (dx > 0 && !prevHrefRef.current) clamped = dx * 0.25;
      if (dx < 0 && !nextHrefRef.current) clamped = dx * 0.25;

      currentX = clamped;
      e.preventDefault();
      track!.style.transform = `translateX(${clamped}px)`;

      // 화면 절반 이상 넘어가면 상단바 제목도 미리 옆 장 이름으로 바꿔준다.
      if (titleEl) {
        if (clamped > window.innerWidth * 0.5 && prevPeekRef.current) {
          titleEl.textContent = prevPeekRef.current.title;
        } else if (clamped < -window.innerWidth * 0.5 && nextPeekRef.current) {
          titleEl.textContent = nextPeekRef.current.title;
        } else {
          titleEl.textContent = currentTitle;
        }
      }
    }

    function onTouchEnd() {
      if (!dragging || !horizontalLock) {
        dragging = false;
        horizontalLock = null;
        return;
      }
      dragging = false;
      horizontalLock = null;

      const elapsedMs = performance.now() - startTime;
      const velocity = Math.abs(currentX) / Math.max(1, elapsedMs);
      const passedThreshold =
        Math.abs(currentX) > window.innerWidth * THRESHOLD_RATIO ||
        velocity > VELOCITY_THRESHOLD;

      track!.style.transition = "transform 200ms ease-out";

      if (passedThreshold && currentX > 0 && prevHrefRef.current) {
        track!.style.transform = `translateX(${window.innerWidth}px)`;
        if (titleEl && prevPeekRef.current) {
          titleEl.textContent = prevPeekRef.current.title;
        }
        window.setTimeout(() => router.push(prevHrefRef.current!), 190);
      } else if (passedThreshold && currentX < 0 && nextHrefRef.current) {
        track!.style.transform = `translateX(-${window.innerWidth}px)`;
        if (titleEl && nextPeekRef.current) {
          titleEl.textContent = nextPeekRef.current.title;
        }
        window.setTimeout(() => router.push(nextHrefRef.current!), 190);
      } else {
        track!.style.transform = "translateX(0px)";
        if (titleEl) titleEl.textContent = currentTitle;
      }
    }

    track.addEventListener("touchstart", onTouchStart, { passive: true });
    track.addEventListener("touchmove", onTouchMove, { passive: false });
    track.addEventListener("touchend", onTouchEnd);
    track.addEventListener("touchcancel", onTouchEnd);

    return () => {
      track.removeEventListener("touchstart", onTouchStart);
      track.removeEventListener("touchmove", onTouchMove);
      track.removeEventListener("touchend", onTouchEnd);
      track.removeEventListener("touchcancel", onTouchEnd);
      track.style.transform = "";
      track.style.transition = "";
    };
  }, [bookId, chapter]);

  return (
    <div
      id="bible-swipe-viewport"
      className="relative min-h-0 flex-1 overflow-hidden"
    >
      <div id="bible-swipe-track" className="relative h-full w-full">
        <div className="absolute inset-y-0 right-full h-full w-full">
          <ChapterPeekPanel peek={prevPeek} />
        </div>

        <div className="h-full w-full">{children}</div>

        <div className="absolute inset-y-0 left-full h-full w-full">
          <ChapterPeekPanel peek={nextPeek} />
        </div>
      </div>
    </div>
  );
}

// 브라우저 메모리에 계속 남는 캐시 - BibleSwipePager가 마운트/언마운트를 반복해도
// (장을 넘길 때마다 새 인스턴스가 뜬다) 한 번 가져온 장은 다시 안 가져온다.
const peekCache = new Map<string, ChapterPeek | null>();

export function peekCacheKey(
  bookId: number,
  chapter: number,
  translation: string,
  secondary?: string,
) {
  return `${bookId}-${chapter}-${translation}-${secondary ?? ""}`;
}

export async function getCachedChapterPeek(
  bookId: number,
  chapter: number,
  translation: string,
  secondary?: string,
): Promise<ChapterPeek | null> {
  const key = peekCacheKey(bookId, chapter, translation, secondary);
  if (peekCache.has(key)) return peekCache.get(key)!;
  const peek = await getChapterPeek(bookId, chapter, translation, secondary);
  peekCache.set(key, peek);
  return peek;
}

/** 이미 캐시에 있으면 즉시(동기) 돌려준다. 없으면 undefined. */
export function getCachedChapterPeekSync(
  bookId: number,
  chapter: number,
  translation: string,
  secondary?: string,
): ChapterPeek | null | undefined {
  return peekCache.get(peekCacheKey(bookId, chapter, translation, secondary));
}

/**
 * 하단바의 이전/다음 장 버튼처럼, 스와이프가 아니라 버튼 클릭으로 장을 넘길 때도
 * 스와이프와 똑같은 슬라이드 전환 + 미리보기 방식을 쓰기 위한 함수. BibleSwipePager가
 * 이미 옆 장을 캐시에 데워뒀을 가능성이 높으므로(항상 ±2까지 미리 데워둔다), 대부분의
 * 경우 실제 이동 전에 진짜 내용이 슬라이드로 미리 보인다.
 */
export function animateChapterTransition(
  router: { push: (href: string) => void },
  direction: "prev" | "next",
  href: string,
  destTitle?: string,
) {
  const track = document.getElementById("bible-swipe-track");
  const titleEl = document.getElementById("bible-location-title");

  if (!track) {
    router.push(href);
    return;
  }

  track.style.transition = "transform 200ms ease-out";
  track.style.transform = `translateX(${direction === "prev" ? window.innerWidth : -window.innerWidth}px)`;
  if (titleEl && destTitle) titleEl.textContent = destTitle;

  window.setTimeout(() => router.push(href), 190);
}
