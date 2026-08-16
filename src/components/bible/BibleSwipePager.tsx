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
      getChapterPeek(prev.bookId, prev.chapter, translation, secondary).then(
        (peek) => setPrevPeekResult({ key: prevKey, peek }),
      );
      if (prevHrefRef.current) router.prefetch(prevHrefRef.current);
    }
    if (next && nextKey) {
      getChapterPeek(next.bookId, next.chapter, translation, secondary).then(
        (peek) => setNextPeekResult({ key: nextKey, peek }),
      );
      if (nextHrefRef.current) router.prefetch(nextHrefRef.current);
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
