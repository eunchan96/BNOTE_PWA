"use client";

import ChapterPeekPanel from "@/components/bible/ChapterPeekPanel";
import {
  getChapterPeek,
  type ChapterPeek,
} from "@/lib/actions/bible/chapter-peek";
import { nextChapter, previousChapter } from "@/lib/bible/bible-books";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

// 브라우저 메모리에 계속 남는 캐시 - BibleSwipePager가 마운트/언마운트를 반복해도
// (장을 넘길 때마다 새 인스턴스가 뜬다) 한 번 가져온 장은 다시 안 가져온다.
const peekCache = new Map<string, ChapterPeek | null>();
// 같은 장을 동시에 여러 곳(스와이프 미리 데우기, 피커로 직접 이동 등)에서 요청할 때
// 중복으로 서버에 요청하지 않도록, 진행 중인 요청을 여기 저장해두고 재사용한다.
const pending = new Map<string, Promise<ChapterPeek | null>>();

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

  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const promise = getChapterPeek(bookId, chapter, translation, secondary).then(
    (peek) => {
      peekCache.set(key, peek);
      pending.delete(key);
      return peek;
    },
  );
  pending.set(key, promise);
  return promise;
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

/** 전환이 확정된 순간부터 새 화면이 완전히 뜰 때까지 상단바/본문 터치를 잠깐 막는다.
 * 셸이 내부 상태를 다 바꾸면(아래 peek 조회 effect가 새로 실행되는 시점) 자동으로 풀리고,
 * 혹시 못 풀리는 경우를 대비해 최대 1초 후엔 무조건 풀리는 안전장치도 둔다. */
function lockDuringTransition() {
  document.body.classList.add("chapter-transitioning");
  window.setTimeout(() => {
    document.body.classList.remove("chapter-transitioning");
  }, 1000);
}

function unlockTransition() {
  document.body.classList.remove("chapter-transitioning");
}

/**
 * 하단바의 이전/다음 장 버튼처럼, 스와이프가 아니라 버튼 클릭으로 장을 넘길 때도
 * 스와이프와 똑같은 슬라이드 전환 + 미리보기 방식을 쓰기 위한 함수. onCommit은
 * 실제 이동(클라이언트 셸의 내부 상태 변경)을 맡는다 - 더 이상 서버 라우팅을
 * 거치지 않는다.
 */
export function animateChapterTransition(
  direction: "prev" | "next",
  destTitle: string | undefined,
  onCommit: () => void,
) {
  const track = document.getElementById("bible-swipe-track");
  const titleEl = document.getElementById("bible-location-title");

  if (!track) {
    onCommit();
    return;
  }

  track.style.transition = "transform 200ms ease-out";
  track.style.transform = `translateX(${direction === "prev" ? window.innerWidth : -window.innerWidth}px)`;
  if (titleEl && destTitle) titleEl.textContent = destTitle;

  lockDuringTransition();
  window.setTimeout(onCommit, 190);
}

/**
 * 안드로이드 ViewPager2처럼 옆 장의 실제 내용을 미리 가져와 화면 밖(좌우)에 대기시켜
 * 두고, 스와이프하면 그 준비된 내용이 바로 따라오게 한다. 놓아서 전환이 확정되면
 * onNavigate(클라이언트 셸의 내부 상태 변경)를 호출한다 - 더 이상 서버 라우팅을
 * 거치지 않는다.
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
  onNavigate,
  children,
}: {
  bookId: number;
  chapter: number;
  translation: string;
  secondary?: string;
  currentTitle: string;
  onNavigate: (dest: { bookId: number; chapter: number }) => void;
  children: React.ReactNode;
}) {
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

  const onNavigateRef = useRef(onNavigate);
  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);
  const prevPeekRef = useRef<ChapterPeek | null>(null);
  const nextPeekRef = useRef<ChapterPeek | null>(null);
  useEffect(() => {
    prevPeekRef.current = prevPeek;
  }, [prevPeek]);
  useEffect(() => {
    nextPeekRef.current = nextPeek;
  }, [nextPeek]);

  useEffect(() => {
    // 이 effect가 실행됐다는 건 (bookId/chapter가 바뀌어) 새 화면이 실제로 떴다는
    // 뜻이므로, 전환 중 걸어뒀던 입력 잠금을 여기서 푼다.
    unlockTransition();

    if (prev && prevKey) {
      getCachedChapterPeek(
        prev.bookId,
        prev.chapter,
        translation,
        secondary,
      ).then((peek) => setPrevPeekResult({ key: prevKey, peek }));

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
  }, [bookId, chapter, translation, secondary]);

  useLayoutEffect(() => {
    const track = document.getElementById("bible-swipe-track");
    if (!track) return;
    // 콘텐츠는 이미 새 장으로 바뀌었지만, 여기서 곧바로 transform을 초기화해서
    // 화면 안으로 들여오면, 브라우저가 "큰 텍스트 영역 다시 그리기"와 "화면에
    // 드러내기"를 같은 프레임에 처리하면서 아주 짧게 이전 화면이 다시 비치는
    // 현상이 있었다(모바일 브라우저의 페인트 처리 특성으로 보임). 그래서 한 프레임
    // 미뤄서, 새 콘텐츠가 아직 화면 밖에 있는(안 보이는) 상태에서 브라우저가 조용히
    // 다 그리게 한 뒤에야 transform을 원위치시켜 드러낸다.
    const raf = requestAnimationFrame(() => {
      track.style.transition = "";
      track.style.transform = "translateX(0px)";
    });
    return () => cancelAnimationFrame(raf);
  }, [bookId, chapter]);

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

      if (target?.closest("[data-no-swipe-nav]")) {
        dragging = false;
        horizontalLock = null;
        return;
      }

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
      if (dx > 0 && !prev) clamped = dx * 0.25;
      if (dx < 0 && !next) clamped = dx * 0.25;

      currentX = clamped;
      e.preventDefault();
      track!.style.transform = `translateX(${clamped}px)`;

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

      if (passedThreshold && currentX > 0 && prev) {
        track!.style.transform = `translateX(${window.innerWidth}px)`;
        if (titleEl && prevPeekRef.current) {
          titleEl.textContent = prevPeekRef.current.title;
        }
        lockDuringTransition();
        window.setTimeout(() => onNavigateRef.current(prev), 190);
      } else if (passedThreshold && currentX < 0 && next) {
        track!.style.transform = `translateX(-${window.innerWidth}px)`;
        if (titleEl && nextPeekRef.current) {
          titleEl.textContent = nextPeekRef.current.title;
        }
        lockDuringTransition();
        window.setTimeout(() => onNavigateRef.current(next), 190);
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
  }, [bookId, chapter, prev, next]);

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
