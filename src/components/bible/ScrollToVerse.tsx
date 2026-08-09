"use client";

import { useEffect } from "react";

export default function ScrollToVerse({ verse }: { verse: number | null }) {
  useEffect(() => {
    if (verse === null) {
      return;
    }
    const el = document.getElementById(`verse-${verse}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [verse]);

  return null;
}
