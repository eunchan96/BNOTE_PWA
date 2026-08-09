"use client";

import {
  applyVerseHighlight,
  removeVerseHighlight,
  toggleBookmark,
} from "@/lib/actions/bible-actions";
import type { BibleVerseRow } from "@/lib/bible";
import { HIGHLIGHT_PALETTE } from "@/lib/highlights";
import { useState, useTransition } from "react";

type Mode = "none" | "selection" | "colorPicker";

export default function VerseList({
  bookId,
  chapter,
  translation,
  verses,
  secondaryVerses,
  initialHighlights,
}: {
  bookId: number;
  chapter: number;
  translation: string;
  verses: BibleVerseRow[];
  secondaryVerses: BibleVerseRow[] | null;
  initialHighlights: Record<number, string>;
}) {
  const [highlights, setHighlights] =
    useState<Record<number, string>>(initialHighlights);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<Mode>("none");
  const [isPending, startTransition] = useTransition();

  function toggleVerse(verse: number) {
    setSelectedVerses((prev) => {
      const next = new Set(prev);
      if (next.has(verse)) {
        next.delete(verse);
      } else {
        next.add(verse);
      }

      if (next.size === 0) {
        setMode("none");
      } else {
        setMode("selection");
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedVerses(new Set());
    setMode("none");
  }

  function handleBookmark() {
    if (selectedVerses.size !== 1) return;
    const verse = [...selectedVerses][0];
    startTransition(async () => {
      await toggleBookmark(bookId, chapter, verse);
      clearSelection();
    });
  }

  function handleHighlightColor(colorHex: string) {
    if (selectedVerses.size === 0) return;
    const targets = verses.filter((v) => selectedVerses.has(v.verse));

    startTransition(async () => {
      await applyVerseHighlight(
        bookId,
        chapter,
        translation,
        colorHex,
        targets.map((v) => ({ verse: v.verse, text: v.text, text2: v.text2 })),
      );
      setHighlights((prev) => {
        const next = { ...prev };
        for (const v of targets) next[v.verse] = colorHex;
        return next;
      });
      clearSelection();
    });
  }

  function handleRemoveHighlight() {
    if (selectedVerses.size === 0) return;
    const verseNums = [...selectedVerses];

    startTransition(async () => {
      await removeVerseHighlight(bookId, chapter, verseNums, translation);
      setHighlights((prev) => {
        const next = { ...prev };
        for (const v of verseNums) delete next[v];
        return next;
      });
      clearSelection();
    });
  }

  const hasExistingHighlight = [...selectedVerses].some(
    (v) => highlights[v] !== undefined,
  );

  return (
    <>
      <ol className="flex flex-col">
        {verses.map((verse) => {
          const colorHex = highlights[verse.verse];
          const isSelected = selectedVerses.has(verse.verse);
          const secondary = secondaryVerses?.find(
            (v) => v.verse === verse.verse,
          );

          return (
            <li
              key={verse.verse}
              id={`verse-${verse.verse}`}
              className="scroll-mt-14"
            >
              {verse.title && (
                <p className="px-2 pt-2.5 pb-0 text-sm font-bold text-brown-primary">
                  {verse.title}
                </p>
              )}

              <button
                type="button"
                onClick={() => toggleVerse(verse.verse)}
                className={`flex w-full gap-1 py-1 pb-2 pl-1.5 pr-3 text-left ${
                  isSelected ? "bg-brown-primary/10" : ""
                }`}
              >
                <span className="mt-0.5 w-[26px] shrink-0 text-center font-bold text-text-secondary">
                  {verse.verse}
                </span>
                <div className="flex-1">
                  <p className="text-base leading-relaxed text-text-primary">
                    <span
                      style={
                        colorHex ? { backgroundColor: colorHex } : undefined
                      }
                    >
                      {verse.text}
                    </span>
                  </p>
                  {/* 함께보기: 주성경이 소제목으로 안 쪼개진 경우엔 여기서 한 덩어리로 */}
                  {secondary && !verse.title2 && (
                    <p className="mt-1 text-[15px] leading-relaxed text-brown-light">
                      {secondary.text}
                    </p>
                  )}
                </div>
              </button>

              {verse.title2 && (
                <>
                  <p className="px-2 pb-0 text-sm font-bold text-brown-primary">
                    {verse.title2}
                  </p>
                  <div className="flex gap-1 py-1 pb-2 pl-1.5 pr-3">
                    <span className="w-[26px] shrink-0" />
                    <div className="flex-1">
                      <p className="text-base leading-relaxed text-text-primary">
                        <span
                          style={
                            colorHex ? { backgroundColor: colorHex } : undefined
                          }
                        >
                          {verse.text2}
                        </span>
                      </p>
                      {/* 함께보기: 주성경이 소제목으로 쪼개진 경우, 함께보기도 같은 지점에서 나눠서 */}
                      {secondary && (
                        <p className="mt-1 text-[15px] leading-relaxed text-brown-light">
                          {secondary.text}
                        </p>
                      )}
                      {secondary?.text2 && (
                        <p className="mt-1 text-[15px] leading-relaxed text-brown-light">
                          {secondary.text2}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ol>

      {mode === "selection" && (
        <div className="fixed inset-x-0 bottom-[60px] z-10 flex justify-center">
          <div className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 shadow-lg">
            <ToolbarButton label="✕" onClick={clearSelection} />
            <Divider />
            {selectedVerses.size === 1 && (
              <ToolbarButton
                label="북마크"
                onClick={handleBookmark}
                disabled={isPending}
              />
            )}
            <ToolbarButton
              label="하이라이트"
              onClick={() => setMode("colorPicker")}
              disabled={isPending}
            />
          </div>
        </div>
      )}

      {mode === "colorPicker" && (
        <div className="fixed inset-x-0 bottom-[60px] z-10 flex justify-center">
          <div className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 shadow-lg">
            <ToolbarButton label="✕" onClick={clearSelection} />
            <Divider />
            {hasExistingHighlight && (
              <>
                <button
                  type="button"
                  onClick={handleRemoveHighlight}
                  disabled={isPending}
                  className="px-3 py-2 text-sm text-[#FF8A80]"
                >
                  해제
                </button>
                <Divider />
              </>
            )}
            {HIGHLIGHT_PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleHighlightColor(color)}
                disabled={isPending}
                className="h-6 w-6 shrink-0 rounded-full border border-white/20"
                style={{ backgroundColor: color }}
                aria-label={color}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-2 text-sm text-white disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div className="h-6 w-px bg-white/20" />;
}
