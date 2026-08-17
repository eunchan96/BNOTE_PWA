"use client";

// 클라이언트 주도 장 이동(스와이프/버튼/피커)을 하면, 주소창(pathname)이 Next.js
// 라우터를 거치지 않고 history.pushState로만 바뀌기 때문에 usePathname() 같은
// Next 훅으로는 "지금 어느 장인지"를 정확히 알 수 없다. 그래서 BibleChapterShell이
// 장이 바뀔 때마다 이 저장소에 직접 알려주고, BottomNav 같은 다른 컴포넌트는
// 여기서 구독해서 최신 상태를 얻는다.

export type BibleLocation = {
  bookId: number;
  chapter: number;
  translation: string;
  secondary?: string;
} | null;

let current: BibleLocation = null;
const listeners = new Set<(loc: BibleLocation) => void>();

export function setCurrentBibleLocation(loc: BibleLocation) {
  current = loc;
  listeners.forEach((listener) => listener(loc));
}

export function getCurrentBibleLocation(): BibleLocation {
  return current;
}

export function subscribeCurrentBibleLocation(
  listener: (loc: BibleLocation) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}