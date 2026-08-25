"use client";

import { useEffect } from "react";

export default function ScrollToVerse({
  verse,
  bookId,
  chapter,
}: {
  verse: number | null;
  bookId: number;
  chapter: number;
}) {
  useEffect(() => {
    if (verse === null) return;

    let cancelled = false;
    let attempts = 0;

    // 장을 옮긴 직후에는(특히 클라이언트 주도 이동에서) 새 장의 본문(verses)이
    // 비동기로 나중에 갱신되기 때문에, 이 시점엔 그 절 요소가 아직 DOM에 없거나
    // 심지어 예전 장의 같은 번호 절이 남아있을 수 있다. 그래서 진짜 그 요소가
    // 나타날 때까지 몇 프레임 정도 재시도한다.
    function tryScroll() {
      if (cancelled) return;
      const el = document.getElementById(`verse-${bookId}-${chapter}-${verse}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      attempts += 1;
      if (attempts < 30) {
        requestAnimationFrame(tryScroll);
      }
    }

    tryScroll();
    return () => {
      cancelled = true;
    };
    // bookId/chapter도 의존성에 넣어서, 절 번호가 우연히 같아도(예: 다른 장의
    // 3절로 다시 이동) 반드시 다시 시도하게 한다.
  }, [verse, bookId, chapter]);

  return null;
}
