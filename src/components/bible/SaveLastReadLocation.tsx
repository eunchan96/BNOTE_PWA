"use client";

import { saveLastReadLocation } from "@/lib/actions/bible/preferences";
import { useEffect } from "react";

export default function SaveLastReadLocation({
  bookId,
  chapter,
  verse,
}: {
  bookId: number;
  chapter: number;
  verse: number | null;
}) {
  useEffect(() => {
    saveLastReadLocation(bookId, chapter, verse ?? undefined);
  }, [bookId, chapter, verse]);

  return null;
}
