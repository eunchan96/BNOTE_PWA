"use client";

import { useEffect } from "react";

export default function CustomScrollbar() {
  useEffect(() => {
    const container = document.getElementById("bible-scroll-container");
    const thumb = document.getElementById("bible-scroll-thumb");
    if (!container || !thumb) return;

    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    function showThenScheduleHide() {
      thumb!.style.opacity = "1";
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        thumb!.style.opacity = "0";
      }, 800);
    }

    // 위치/크기만 다시 계산 - 보이기/숨기기는 건드리지 않는다.
    function syncPosition() {
      const scrollHeight = container!.scrollHeight;
      const clientHeight = container!.clientHeight;
      if (scrollHeight <= clientHeight) {
        thumb!.style.opacity = "0";
        return;
      }

      const trackHeight = clientHeight;
      const thumbHeight = Math.max(
        24,
        (clientHeight / scrollHeight) * trackHeight,
      );
      const maxScrollTop = scrollHeight - clientHeight;
      const maxThumbTravel = trackHeight - thumbHeight;
      const ratio = container!.scrollTop / maxScrollTop;
      const thumbTop = ratio * maxThumbTravel;

      thumb!.style.height = `${thumbHeight}px`;
      thumb!.style.transform = `translateY(${thumbTop}px)`;
    }

    // 실제로 스크롤됐을 때만 - 위치 갱신 + 보이기.
    function handleScroll() {
      syncPosition();
      showThenScheduleHide();
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    // ResizeObserver는 관찰을 시작하자마자 스크롤 여부와 무관하게 최초 1번은
    // 무조건 콜백을 호출하는 스펙이 있어서, 여기서는 위치만 조용히 맞추고
    // 스크롤바를 보이게 하지는 않는다 - 안 그러면 페이지 로딩 직후 스크롤바가
    // 실제로는 아무 스크롤도 없었는데 잠깐 나타났다 사라지는 문제가 있었다.
    const resizeObserver = new ResizeObserver(syncPosition);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div
      id="bible-scroll-thumb"
      className="pointer-events-none absolute right-0 top-0 w-1 rounded-full bg-black/25 opacity-0 transition-opacity duration-200"
      style={{ height: 24 }}
    />
  );
}
