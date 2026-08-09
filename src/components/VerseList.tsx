"use client";

import ScrapGroupPickerSheet from "@/components/ScrapGroupPickerSheet";
import VerseMemoEditorSheet from "@/components/VerseMemoEditorSheet";
import {
  applyVerseHighlight,
  removeVerseHighlight,
  toggleBookmark,
} from "@/lib/actions/bible-actions";
import { createScraps } from "@/lib/actions/scraps";
import type { BibleVerseRow, RawVerseRow } from "@/lib/bible";
import { HIGHLIGHT_PALETTE } from "@/lib/highlights";
import { useState, useTransition } from "react";

type Mode = "none" | "selection" | "colorPicker";

const PSALMS_BOOK_PART: Record<number, string> = {
  1: "제일권",
  42: "제이권",
  73: "제삼권",
  90: "제사권",
  107: "제오권",
};

function psalmsBookPartLabel(
  bookId: number,
  chapter: number,
  verse: number,
): string | null {
  if (bookId !== 19 || verse !== 1) return null;
  return PSALMS_BOOK_PART[chapter] ?? null;
}

export default function VerseList({
  bookId,
  chapter,
  translation,
  verses,
  secondaryVerses,
  initialHighlights,
  initialMemoVerses,
}: {
  bookId: number;
  chapter: number;
  translation: string;
  verses: BibleVerseRow[];
  secondaryVerses: RawVerseRow[] | null;
  initialHighlights: Record<number, string>;
  initialMemoVerses: number[];
}) {
  const [highlights, setHighlights] =
    useState<Record<number, string>>(initialHighlights);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<Mode>("none");
  const [showScrapPicker, setShowScrapPicker] = useState(false);
  const [memoVerses, setMemoVerses] = useState<Set<number>>(
    new Set(initialMemoVerses),
  );
  const [memoEditorVerse, setMemoEditorVerse] = useState<number | null>(null);
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

  function handleNumberClick(verseNum: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (memoVerses.has(verseNum)) {
      setMemoEditorVerse(verseNum);
    } else {
      toggleVerse(verseNum);
    }
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

  function handleScrapGroupSelected(groupId: number, groupName: string) {
    const targets = verses.filter((v) => selectedVerses.has(v.verse));
    startTransition(async () => {
      const runCount = await createScraps(
        groupId,
        bookId,
        chapter,
        targets.map((v) => ({
          verse: v.verse,
          text: v.text2 ? `${v.text}\n${v.text2}` : v.text,
        })),
      );
      setShowScrapPicker(false);
      clearSelection();
      alert(
        runCount > 1
          ? `'${groupName}'에 ${runCount}개로 나눠서 스크랩했어요`
          : `'${groupName}'에 스크랩했어요`,
      );
    });
  }

  // 장의 최대 절 번호가 100 이상이면(시편 119편처럼) 번호 칸을 조금 더 넓힌다.
  const maxVerse = verses.reduce((max, v) => Math.max(max, v.verse), 1);
  const numberColumnWidth = maxVerse >= 100 ? "w-[26px]" : "w-[20px]";

  return (
    <>
      <ol className="flex flex-col">
        {verses.map((verse, index) => {
          const colorHex = highlights[verse.verse];
          const isSelected = selectedVerses.has(verse.verse);
          const secondary = secondaryVerses?.find(
            (v) => v.verse === verse.verse,
          );

          const secondaryFirstLine = secondary
            ? verse.title2
              ? secondary.text
              : secondary.text2
                ? `${secondary.text} ${secondary.text2}`
                : secondary.text
            : null;

          const bookPartLabel = psalmsBookPartLabel(
            bookId,
            chapter,
            verse.verse,
          );

          // 장이 소제목·권 표시 없이 1절부터 바로 시작하면 맨 위 여백을 더 준다.
          const isFirstVerse = index === 0;
          const extraTopSpacing =
            isFirstVerse && !verse.title && !bookPartLabel;

          return (
            <li
              key={verse.verse}
              id={`verse-${verse.verse}`}
              className="scroll-mt-14"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleVerse(verse.verse)}
                onKeyDown={(e) => e.key === "Enter" && toggleVerse(verse.verse)}
                className={`block w-full cursor-pointer text-left ${
                  isSelected ? "bg-brown-primary/10" : ""
                }`}
              >
                {bookPartLabel && (
                  <p className="px-3 pt-3.5 pb-0 text-sm font-bold text-brown-dark">
                    [{bookPartLabel}]
                  </p>
                )}

                {verse.title && (
                  <p className="px-2 pt-2.5 pb-0 text-sm font-bold text-brown-primary">
                    &lt;{verse.title}&gt;
                  </p>
                )}

                <div
                  className={`flex gap-1 py-1 pb-2 pl-1.5 pr-3 ${extraTopSpacing ? "pt-3" : "pt-1"}`}
                >
                  <button
                    type="button"
                    onClick={(e) => handleNumberClick(verse.verse, e)}
                    className={`${numberColumnWidth} shrink-0 cursor-pointer self-start text-center font-bold ${
                      memoVerses.has(verse.verse)
                        ? "text-brown-primary underline"
                        : "text-text-secondary"
                    }`}
                  >
                    {verse.verse}
                  </button>
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
                    {secondaryFirstLine && (
                      <p className="mt-1 text-[15px] leading-relaxed text-brown-light">
                        {secondaryFirstLine}
                      </p>
                    )}
                  </div>
                </div>

                {verse.title2 && (
                  <>
                    <p className="px-2 pb-0 text-sm font-bold text-brown-primary">
                      &lt;{verse.title2}&gt;
                    </p>
                    <div className="flex gap-1 py-1 pb-2 pl-1.5 pr-3">
                      <span className={`${numberColumnWidth} shrink-0`} />
                      <div className="flex-1">
                        <p className="text-base leading-relaxed text-text-primary">
                          <span
                            style={
                              colorHex
                                ? { backgroundColor: colorHex }
                                : undefined
                            }
                          >
                            {verse.text2}
                          </span>
                        </p>
                        {secondary?.text2 && (
                          <p className="mt-1 text-[15px] leading-relaxed text-brown-light">
                            {secondary.text2}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* 장 끝 여백 (안드로이드는 화면 높이의 30%, 나중에 "읽음 표시" 버튼이 여기 들어갈 자리) */}
      <div className="h-[30vh]" />

      {mode === "selection" && (
        <div className="fixed inset-x-0 bottom-[60px] z-10 flex justify-center">
          <div className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 shadow-lg">
            <ToolbarButton label="✕" onClick={clearSelection} />
            <Divider />
            {selectedVerses.size === 1 && (
              <>
                <ToolbarButton
                  label="북마크"
                  onClick={handleBookmark}
                  disabled={isPending}
                />
                <ToolbarButton
                  label="메모"
                  onClick={() => {
                    const verse = [...selectedVerses][0];
                    setMemoEditorVerse(verse);
                    clearSelection();
                  }}
                  disabled={isPending}
                />
              </>
            )}
            <ToolbarButton
              label="하이라이트"
              onClick={() => setMode("colorPicker")}
              disabled={isPending}
            />
            <ToolbarButton
              label="스크랩"
              onClick={() => setShowScrapPicker(true)}
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
                  className="cursor-pointer px-3 py-2 text-sm text-[#FF8A80]"
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
                className="h-6 w-6 shrink-0 cursor-pointer rounded-full border border-white/20"
                style={{ backgroundColor: color }}
                aria-label={color}
              />
            ))}
          </div>
        </div>
      )}

      {showScrapPicker && (
        <ScrapGroupPickerSheet
          onSelect={handleScrapGroupSelected}
          onClose={() => setShowScrapPicker(false)}
        />
      )}

      {memoEditorVerse !== null && (
        <VerseMemoEditorSheet
          bookId={bookId}
          chapter={chapter}
          verse={memoEditorVerse}
          verseText={
            verses.find((v) => v.verse === memoEditorVerse)?.text ?? ""
          }
          onClose={() => setMemoEditorVerse(null)}
          onChanged={() =>
            setMemoVerses((prev) => new Set(prev).add(memoEditorVerse))
          }
        />
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
      className="cursor-pointer px-3 py-2 text-sm text-white disabled:cursor-default disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div className="h-6 w-px bg-white/20" />;
}
