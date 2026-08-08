"use client";

import { useRouter } from "next/navigation";
import { TRANSLATIONS } from "@/lib/translations";

export default function TranslationSelect({
  bookId,
  chapter,
  translation,
}: {
  bookId: number;
  chapter: number;
  translation: string;
}) {
  const router = useRouter();

  return (
    <select
      aria-label="번역본 선택"
      value={translation}
      onChange={(e) => router.push(`/bible/${bookId}/${chapter}?translation=${e.target.value}`)}
      className="h-8 rounded bg-brown-dark px-2 text-xs font-medium text-white"
    >
      {TRANSLATIONS.map((t) => (
        <option key={t.code} value={t.code} className="text-black">
          {t.displayName}
        </option>
      ))}
    </select>
  );
}