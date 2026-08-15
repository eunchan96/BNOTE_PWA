"use client";

import { useEffect } from "react";

/**
 * 메뉴/바텀시트/다이얼로그처럼 화면 위에 덮이는(overlay) 컴포넌트가 열려있는 동안
 * 그 뒤에 있는 body가 함께 스크롤되지 않도록 잠근다. 컴포넌트가 언마운트되면
 * (닫히면) 원래 상태로 되돌린다.
 */
export function useLockBodyScroll() {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);
}