"use client";

import { useEffect } from "react";

/**
 * 직접 그리는 스크롤바 썸. 네이티브 스크롤바는 정수 픽셀 단위로만 움직이고
 * transform 기반 애니메이션과 타이밍이 안 맞아서, 이 썸을 대신 그린다.
 *
 * - 손가락 스크롤(또는 마우스 휠) 중에는 이 컴포넌트의 scroll 리스너가 위치를 갱신한다.
 * - 자동스크롤 중에는 BibleTopBar가 같은 rAF 루프 안에서 이 썸의 transform을
 *   직접 갱신한다(둘 다 #bible-scroll-thumb id를 통해 통신).
 *
 * 나중에 "스크롤바 숨기기" 설정이 생기면, 이 컴포넌트를 조건부로 렌더링하지 않기만
 * 하면 된다 - 자동스크롤 애니메이션 로직과는 완전히 분리되어 있다.
 */
export default function CustomScrollbar() {
  useEffect(() => {
    const container = document.getElementById("bible-scroll-container");
    const thumb = document.getElementById("bible-scroll-thumb");
    if (!container || !thumb) return;

    function update() {
      const scrollHeight = container!.scrollHeight;
      const clientHeight = container!.clientHeight;
      if (scrollHeight <= clientHeight) {
        thumb!.style.opacity = "0";
        return;
      }
      thumb!.style.opacity = "1";

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

    update();
    container.addEventListener("scroll", update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      id="bible-scroll-thumb"
      className="pointer-events-none absolute right-0 top-0 w-1 rounded-full bg-black/25"
      style={{ height: 24 }}
    />
  );
}
