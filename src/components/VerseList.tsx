"use client";

import ScrapGroupPickerSheet from "@/components/ScrapGroupPickerSheet";
import VerseMemoEditorSheet from "@/components/VerseMemoEditorSheet";
import WordMemoSheet, {
  type WordMemoBoxInput,
} from "@/components/WordMemoSheet";
import { toggleBookmark } from "@/lib/actions/bible-actions";
import {
  applyPartialHighlight,
  applyVerseHighlight,
  removeVerseHighlight,
  type HighlightRange,
  type HighlightRangeMap,
} from "@/lib/actions/highlights";
import { createScraps } from "@/lib/actions/scraps";
import type { WordMemoRow } from "@/lib/actions/word-memos";
import type { BibleVerseRow, RawVerseRow } from "@/lib/bible";
import { HIGHLIGHT_PALETTE } from "@/lib/highlight-colors";
import { Fragment, useEffect, useState, useTransition } from "react";

type Mode =
  | "none"
  | "selection"
  | "colorPicker"
  | "textSelection"
  | "textColorPicker";

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

/** 문자 단위로 색을 입혀서, 겹치는 하이라이트는 나중 것(id가 큰 것)이 위에 칠해지게 만든다. */
function contrastTextColor(colorHex: string): string {
  const hex = colorHex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#212121" : "#F5F5F5";
}

function renderColoredText(
  text: string,
  highlightRanges: HighlightRange[],
  memoRanges: { start: number; end: number }[],
) {
  if (highlightRanges.length === 0 && memoRanges.length === 0) return text;

  const colors: (string | null)[] = new Array(text.length).fill(null);
  for (const r of [...highlightRanges].sort((a, b) => a.id - b.id)) {
    for (let i = r.start; i < Math.min(r.end, text.length); i++)
      colors[i] = r.colorHex;
  }
  const underline: boolean[] = new Array(text.length).fill(false);
  for (const m of memoRanges) {
    for (let i = m.start; i < Math.min(m.end, text.length); i++)
      underline[i] = true;
  }

  const chunks: { text: string; color: string | null; underline: boolean }[] =
    [];
  let start = 0;
  let currentColor = colors[0] ?? null;
  let currentUnderline = underline[0] ?? false;
  for (let i = 1; i <= text.length; i++) {
    const c = i < text.length ? colors[i] : null;
    const u = i < text.length ? underline[i] : false;
    if (c !== currentColor || u !== currentUnderline) {
      chunks.push({
        text: text.slice(start, i),
        color: currentColor,
        underline: currentUnderline,
      });
      start = i;
      currentColor = c;
      currentUnderline = u;
    }
  }

  return chunks.map((chunk, i) => {
    if (!chunk.color && !chunk.underline)
      return <Fragment key={i}>{chunk.text}</Fragment>;
    const style: React.CSSProperties = {};
    if (chunk.color) {
      style.backgroundColor = chunk.color;
      style.color = contrastTextColor(chunk.color);
    }
    if (chunk.underline) style.textDecoration = "underline";
    return (
      <span key={i} style={style}>
        {chunk.text}
      </span>
    );
  });
}

type PendingSelection = {
  verse: number;
  segment: number;
  start: number;
  end: number;
};

export default function VerseList({
  bookId,
  chapter,
  translation,
  verses,
  secondaryVerses,
  initialHighlightRanges,
  initialWordMemos,
  initialMemoVerses,
}: {
  bookId: number;
  chapter: number;
  translation: string;
  verses: BibleVerseRow[];
  secondaryVerses: RawVerseRow[] | null;
  initialHighlightRanges: HighlightRangeMap;
  initialWordMemos: WordMemoRow[];
  initialMemoVerses: number[];
}) {
  const [highlightRanges, setHighlightRanges] = useState<HighlightRangeMap>(
    initialHighlightRanges,
  );
  const [wordMemos, setWordMemos] = useState<WordMemoRow[]>(initialWordMemos);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<Mode>("none");
  const [pendingSelection, setPendingSelection] =
    useState<PendingSelection | null>(null);
  const [wordMemoSheet, setWordMemoSheet] = useState<{
    verse: number;
    segment: number;
    boxes: WordMemoBoxInput[];
  } | null>(null);
  const [showScrapPicker, setShowScrapPicker] = useState(false);
  const [memoVerses, setMemoVerses] = useState<Set<number>>(
    new Set(initialMemoVerses),
  );
  const [memoEditorVerse, setMemoEditorVerse] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // 드래그로 텍스트를 선택하면(절 하나 안에서만) 하단 툴바를 "텍스트 선택" 모드로 바꾼다.
  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setPendingSelection(null);
        if (mode === "textSelection") setMode("none");
        return;
      }

      const range = selection.getRangeAt(0);
      const anchorNode = range.commonAncestorContainer;
      const anchorEl =
        anchorNode.nodeType === Node.TEXT_NODE
          ? anchorNode.parentElement
          : (anchorNode as Element);
      const container = anchorEl?.closest(
        "[data-highlight-container]",
      ) as HTMLElement | null;

      if (
        !container ||
        !container.contains(range.startContainer) ||
        !container.contains(range.endContainer)
      ) {
        setPendingSelection(null);
        if (mode === "textSelection") setMode("none");
        return;
      }

      const verse = Number(container.dataset.verse);
      const segment = Number(container.dataset.segment);

      const preRange = document.createRange();
      preRange.selectNodeContents(container);
      preRange.setEnd(range.startContainer, range.startOffset);
      const start = preRange.toString().length;
      const end = start + range.toString().length;

      if (start === end) {
        setPendingSelection(null);
        return;
      }

      setPendingSelection({ verse, segment, start, end });
      setMode("textSelection");
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [mode]);

  function clearBrowserSelection() {
    window.getSelection()?.removeAllRanges();
  }

  function toggleVerse(verse: number) {
    // 텍스트 드래그 선택 중이면 절 전체 선택 토글은 무시한다.
    if (window.getSelection()?.toString()) return;

    setSelectedVerses((prev) => {
      const next = new Set(prev);
      if (next.has(verse)) next.delete(verse);
      else next.add(verse);
      setMode(next.size === 0 ? "none" : "selection");
      return next;
    });
  }

  function clearSelection() {
    setSelectedVerses(new Set());
    setPendingSelection(null);
    clearBrowserSelection();
    setMode("none");
  }

  function handleNumberClick(verseNum: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (memoVerses.has(verseNum)) {
      setMemoEditorVerse(verseNum);
    } else {
      toggleVerse(verseNum);
    }
  }

  function handleBookmark() {
    if (selectedVerses.size !== 1) return;
    const verse = [...selectedVerses][0];
    startTransition(async () => {
      await toggleBookmark(bookId, chapter, verse);
      clearSelection();
    });
  }

  // 절 전체 하이라이트 (기존 방식 그대로: 다시 칠하면 그 절의 기존 하이라이트는 지워짐)
  function handleWholeVerseHighlightColor(colorHex: string) {
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
      setHighlightRanges((prev) => {
        const next = { ...prev };
        for (const v of targets) {
          next[`${v.verse}-0`] = [
            {
              id: Date.now() + v.verse,
              segment: 0,
              start: 0,
              end: v.text.length,
              colorHex,
            },
          ];
          if (v.text2) {
            next[`${v.verse}-1`] = [
              {
                id: Date.now() + v.verse + 1,
                segment: 1,
                start: 0,
                end: v.text2.length,
                colorHex,
              },
            ];
          }
        }
        return next;
      });
      clearSelection();
    });
  }

  function handleRemoveWholeVerseHighlight() {
    if (selectedVerses.size === 0) return;
    const verseNums = [...selectedVerses];

    startTransition(async () => {
      await removeVerseHighlight(bookId, chapter, verseNums, translation);
      setHighlightRanges((prev) => {
        const next = { ...prev };
        for (const v of verseNums) {
          delete next[`${v}-0`];
          delete next[`${v}-1`];
        }
        return next;
      });
      clearSelection();
    });
  }

  // 드래그로 선택한 부분에 하이라이트 (기존 것 안 지우고 추가)
  function handlePartialHighlightColor(colorHex: string) {
    if (!pendingSelection) return;
    const { verse, segment, start, end } = pendingSelection;

    startTransition(async () => {
      const range = await applyPartialHighlight(
        bookId,
        chapter,
        verse,
        translation,
        segment,
        start,
        end,
        colorHex,
      );
      setHighlightRanges((prev) => {
        const key = `${verse}-${segment}`;
        const next = { ...prev };
        next[key] = [...(next[key] ?? []), range];
        return next;
      });
      clearSelection();
    });
  }

  function handleWordMemoAction() {
    if (!pendingSelection) return;
    const { verse, segment, start, end } = pendingSelection;

    const verseData = verses.find((v) => v.verse === verse);
    const fullText =
      segment === 1 ? (verseData?.text2 ?? "") : (verseData?.text ?? "");

    const overlapping = wordMemos.filter(
      (m) =>
        m.verse === verse &&
        m.segment === segment &&
        !(end <= m.startOffset || start >= m.endOffset),
    );

    const boxes: WordMemoBoxInput[] = [
      {
        id: null,
        start,
        end,
        selectedText: fullText.slice(start, end),
        text: "",
      },
      ...overlapping.map((m) => ({
        id: m.id,
        start: m.startOffset,
        end: m.endOffset,
        selectedText: fullText.slice(m.startOffset, m.endOffset),
        text: m.text,
      })),
    ];

    setWordMemoSheet({ verse, segment, boxes });
    setPendingSelection(null);
    clearBrowserSelection();
    setMode("none");
  }

  function handleCopySelection() {
    if (!pendingSelection) return;
    const { verse, segment, start, end } = pendingSelection;
    const verseData = verses.find((v) => v.verse === verse);
    const fullText =
      segment === 1 ? (verseData?.text2 ?? "") : (verseData?.text ?? "");
    navigator.clipboard.writeText(fullText.slice(start, end));
    clearSelection();
  }

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

  const hasExistingWholeHighlight = [...selectedVerses].some(
    (v) => highlightRanges[`${v}-0`]?.length,
  );

  const maxVerse = verses.reduce((max, v) => Math.max(max, v.verse), 1);
  const numberColumnWidth = maxVerse >= 100 ? "w-[26px]" : "w-[20px]";

  return (
    <>
      <ol className="flex flex-col">
        {verses.map((verse, index) => {
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
                    <p
                      data-highlight-container
                      data-verse={verse.verse}
                      data-segment={0}
                      className="select-text text-base leading-relaxed text-text-primary"
                    >
                      {renderColoredText(
                        verse.text,
                        highlightRanges[`${verse.verse}-0`] ?? [],
                        wordMemos
                          .filter(
                            (m) => m.verse === verse.verse && m.segment === 0,
                          )
                          .map((m) => ({
                            start: m.startOffset,
                            end: m.endOffset,
                          })),
                      )}
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
                        <p
                          data-highlight-container
                          data-verse={verse.verse}
                          data-segment={1}
                          className="select-text text-base leading-relaxed text-text-primary"
                        >
                          {renderColoredText(
                            verse.text2 ?? "",
                            highlightRanges[`${verse.verse}-1`] ?? [],
                            wordMemos
                              .filter(
                                (m) =>
                                  m.verse === verse.verse && m.segment === 1,
                              )
                              .map((m) => ({
                                start: m.startOffset,
                                end: m.endOffset,
                              })),
                          )}
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

      <div className="h-[30vh]" />

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
            <ToolbarButton
              label="스크랩"
              onClick={() => setShowScrapPicker(true)}
              disabled={isPending}
            />
          </div>
        </div>
      )}

      {mode === "colorPicker" && (
        <ColorPickerBar
          onCancel={clearSelection}
          onPick={handleWholeVerseHighlightColor}
          onRemove={
            hasExistingWholeHighlight
              ? handleRemoveWholeVerseHighlight
              : undefined
          }
          disabled={isPending}
        />
      )}

      {mode === "textSelection" && pendingSelection && (
        <div className="fixed inset-x-0 bottom-[60px] z-10 flex justify-center">
          <div className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 shadow-lg">
            <ToolbarButton label="✕" onClick={clearSelection} />
            <Divider />
            <ToolbarButton label="복사" onClick={handleCopySelection} />
            <ToolbarButton
              label="하이라이트"
              onClick={() => setMode("textColorPicker")}
            />
            <ToolbarButton label="메모" onClick={handleWordMemoAction} />
          </div>
        </div>
      )}

      {mode === "textColorPicker" && (
        <ColorPickerBar
          onCancel={clearSelection}
          onPick={handlePartialHighlightColor}
          disabled={isPending}
        />
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

      {wordMemoSheet && (
        <WordMemoSheet
          bookId={bookId}
          chapter={chapter}
          verse={wordMemoSheet.verse}
          translation={translation}
          segment={wordMemoSheet.segment}
          initialBoxes={wordMemoSheet.boxes}
          onClose={() => setWordMemoSheet(null)}
          onSaved={(memo) => {
            setWordMemos((prev) => [
              ...prev.filter((m) => m.id !== memo.id),
              memo,
            ]);
          }}
          onDeleted={(id) => {
            setWordMemos((prev) => prev.filter((m) => m.id !== id));
          }}
        />
      )}
    </>
  );
}

function ColorPickerBar({
  onCancel,
  onPick,
  onRemove,
  disabled,
}: {
  onCancel: () => void;
  onPick: (color: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[60px] z-10 flex justify-center">
      <div className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 shadow-lg">
        <ToolbarButton label="✕" onClick={onCancel} />
        <Divider />
        {onRemove && (
          <>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
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
            onClick={() => onPick(color)}
            disabled={disabled}
            className="h-6 w-6 shrink-0 cursor-pointer rounded-full border border-white/20"
            style={{ backgroundColor: color }}
            aria-label={color}
          />
        ))}
      </div>
    </div>
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
