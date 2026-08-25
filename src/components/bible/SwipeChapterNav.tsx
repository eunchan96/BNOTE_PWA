"use client";

import { nextChapter, previousChapter } from "@/lib/bible/bible-books";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * 안드로이드 ViewPager2처럼 옆 장의 실제 내용을 미리 그려서 드래그 중에 보여주는
 * 것까지는 아니지만(그러려면 캐러셀 엔진을 새로 만들어야 함), 손가락을 따라 화면이
 * 밀려나가고 놓으면 장이 전환되는 스와이프 제스처를 구현한다.
 *
 * #bible-swipe-wrapper(성경 본문을 감싸는 바깥 래퍼)에 가로 방향 transform을 직접
 * 건드린다. 세로 스크롤 애니메이션(자동스크롤)은 그 안쪽의 #bible-scroll-content에
 * 별도로 적용되므로 서로 충돌하지 않는다.
 */
export default function SwipeChapterNav({
  bookId,
  chapter,
  translation,
  secondary,
}: {
  bookId: number;
  chapter: number;
  translation: string;
  secondary?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const wrapper = document.getElementById("bible-swipe-wrapper");
    if (!wrapper) return;

    const prev = previousChapter(bookId, chapter);
    const next = nextChapter(bookId, chapter);

    const params = new URLSearchParams();
    if (translation) params.set("translation", translation);
    if (secondary) params.set("secondary", secondary);
    const suffix = params.toString() ? `?${params.toString()}` : "";

    const prevHref = prev
      ? `/bible/${prev.bookId}/${prev.chapter}${suffix}`
      : null;
    const nextHref = next
      ? `/bible/${next.bookId}/${next.chapter}${suffix}`
      : null;

    // 스와이프를 완료해서 실제로 페이지 전환될 때 바로 뜨도록 미리 받아둔다.
    if (prevHref) router.prefetch(prevHref);
    if (nextHref) router.prefetch(nextHref);

    const THRESHOLD_RATIO = 0.25; // 화면 폭의 25% 이상 밀면 전환
    const VELOCITY_THRESHOLD = 0.5; // px/ms - 짧고 빠르게 튕겨도 전환

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
      wrapper!.style.transition = "";
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      // 처음 8px 정도는 방향을 판단하는 용도로만 쓰고 아직 아무것도 안 한다.
      if (horizontalLock === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        horizontalLock = Math.abs(dx) > Math.abs(dy);
        if (!horizontalLock) {
          // 세로 방향이면 평소처럼 세로 스크롤되게 그냥 둔다.
          dragging = false;
          return;
        }
      }
      if (!horizontalLock) return;

      // 더 넘어갈 장이 없는 방향(첫 장/마지막 장)이면 살짝만 저항감 있게 따라오게.
      let clamped = dx;
      if (dx > 0 && !prevHref) clamped = dx * 0.25;
      if (dx < 0 && !nextHref) clamped = dx * 0.25;

      currentX = clamped;
      e.preventDefault();
      wrapper!.style.transform = `translateX(${clamped}px)`;
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

      wrapper!.style.transition = "transform 200ms ease-out";

      if (passedThreshold && currentX > 0 && prevHref) {
        wrapper!.style.transform = `translateX(${window.innerWidth}px)`;
        window.setTimeout(() => router.push(prevHref), 180);
      } else if (passedThreshold && currentX < 0 && nextHref) {
        wrapper!.style.transform = `translateX(-${window.innerWidth}px)`;
        window.setTimeout(() => router.push(nextHref), 180);
      } else {
        wrapper!.style.transform = "translateX(0px)";
      }
    }

    wrapper.addEventListener("touchstart", onTouchStart, { passive: true });
    wrapper.addEventListener("touchmove", onTouchMove, { passive: false });
    wrapper.addEventListener("touchend", onTouchEnd);
    wrapper.addEventListener("touchcancel", onTouchEnd);

    return () => {
      wrapper.removeEventListener("touchstart", onTouchStart);
      wrapper.removeEventListener("touchmove", onTouchMove);
      wrapper.removeEventListener("touchend", onTouchEnd);
      wrapper.removeEventListener("touchcancel", onTouchEnd);
      wrapper.style.transform = "";
      wrapper.style.transition = "";
    };
  }, [bookId, chapter, translation, secondary, router]);

  return null;
}