"use client";

import ScrapGroupPickerSheet from "@/components/bible/ScrapGroupPickerSheet";
import VerseMemoEditorSheet from "@/components/bible/VerseMemoEditorSheet";
import WordMemoSheet, {
  type WordMemoBoxInput,
} from "@/components/bible/WordMemoSheet";
import { toggleBookmark } from "@/lib/actions/bible/bible-actions";
import {
  type HighlightRange,
  type HighlightRangeMap,
} from "@/lib/actions/bible/highlights";
import { createScraps } from "@/lib/actions/bible/scraps";
import { getVerseInteractionState } from "@/lib/actions/bible/verse-interaction";
import type { WordMemoRow } from "@/lib/actions/bible/word-memos";
import type { BibleVerseRow, RawVerseRow } from "@/lib/bible/bible";
import { chapterUnit, getBook } from "@/lib/bible/bible-books";
import { HIGHLIGHT_PALETTE } from "@/lib/bible/highlight-colors";
import { idbGet, idbSet, STORE_NAMES } from "@/lib/offline/db";
import { enqueueSync, processSyncQueue } from "@/lib/offline/sync";
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
function contrastTextColor(colorHex: string | null | undefined): string {
  if (!colorHex) return "#212121";
  const hex = colorHex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return "#212121";
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#212121" : "#F5F5F5";
}

function renderColoredText(
  text: string,
  highlightRanges: HighlightRange[],
  memoRanges: { start: number; end: number }[],
) {
  try {
    return renderColoredTextUnsafe(text, highlightRanges, memoRanges);
  } catch (err) {
    // 특정 절의 하이라이트/메모 데이터가 이상해서 계산 중 예외가 나더라도, 그 절만
    // 일반 텍스트로 보여주고 뒤따르는 절들까지 렌더링이 깨지지 않게 막는다.
    console.error("renderColoredText failed, falling back to plain text", err);
    return text;
  }
}

function renderColoredTextUnsafe(
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
  for (let i = 1; i < text.length; i++) {
    const c = colors[i];
    const u = underline[i];
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
  // 마지막 남은 조각은 항상 무조건 밀어넣는다. 예전에는 "다음 글자와 스타일이 다르면
  // 자른다"는 조건 하나에만 기대고 있었는데, 마지막 조각이 "스타일 없음" 상태이고
  // 그 비교 대상(경계)도 우연히 "스타일 없음"이면 조건이 한 번도 발동하지 않아서
  // 마지막 조각 전체가 통째로 유실됐다 - 하이라이트/메모 뒤에 스타일 없는 텍스트가
  // 남는 흔한 경우(예: 문장 끝부분)에 정확히 이 문제가 났다.
  if (text.length > 0) {
    chunks.push({
      text: text.slice(start),
      color: currentColor,
      underline: currentUnderline,
    });
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
  isLoggedIn,
}: {
  bookId: number;
  chapter: number;
  translation: string;
  verses: BibleVerseRow[];
  secondaryVerses: RawVerseRow[] | null;
  isLoggedIn?: boolean;
}) {
  const [highlightRanges, setHighlightRanges] = useState<HighlightRangeMap>({});
  const [wordMemos, setWordMemos] = useState<WordMemoRow[]>([]);
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
  const [memoVerses, setMemoVerses] = useState<Set<number>>(new Set());
  const [memoEditorVerse, setMemoEditorVerse] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // 본문은 이미(로컬 파일 캐시라) 즉시 그려진 상태다. 하이라이트·단어메모·구절메모는
  // 사용자별 Supabase 조회라 시간이 걸리므로, 화면을 막지 않고 마운트된 뒤 따로 가져와서
  // 채운다 — 안드로이드처럼 본문이 먼저 보이고 하이라이트가 살짝 늦게 입혀지는 느낌.
  // 로컬 우선(offline-first): 기기(IndexedDB)에 캐시된 값이 있으면 네트워크를 전혀
  // 기다리지 않고 즉시 표시한다. 그 다음 백그라운드로 서버 값을 가져와 화면과 캐시를
  // 최신 상태로 맞춘다 - 안드로이드의 로컬 DB처럼, 하이라이트/메모가 로딩 없이 뜨는
  // 느낌을 만들기 위함이다.
  useEffect(() => {
    let cancelled = false;
    const hlKey = `${translation}-${bookId}-${chapter}`;
    const mvKey = `${bookId}-${chapter}`;

    // 장이 바뀌면 이전 장의 하이라이트/메모/선택 상태를 먼저 비운다 - VerseList는
    // 이제 장이 바뀌어도 재마운트되지 않는 구조라서, 안 비우면 새 장의 본문 위에
    // 이전 장의 하이라이트 위치 정보나 선택 상태가 잠깐 그대로 남아 잘못된 위치에
    // 겹쳐 보인다(글자 수가 다르면 위치가 안 맞아 더 눈에 띔). .then()으로 감싸서
    // effect 몸체에서 곧바로 setState를 부르지 않도록 한다.
    Promise.resolve().then(() => {
      if (cancelled) return;
      setHighlightRanges({});
      setWordMemos([]);
      setMemoVerses(new Set());
      setSelectedVerses(new Set());
      setPendingSelection(null);
      setMode("none");
    });

    (async () => {
      const [cachedHighlights, cachedWordMemos, cachedMemoVerses] =
        await Promise.all([
          idbGet<HighlightRangeMap>(STORE_NAMES.highlights, hlKey),
          idbGet<WordMemoRow[]>(STORE_NAMES.wordMemos, hlKey),
          idbGet<number[]>(STORE_NAMES.memoVerses, mvKey),
        ]);
      if (cancelled) return;
      if (cachedHighlights) setHighlightRanges(cachedHighlights);
      if (cachedWordMemos) setWordMemos(cachedWordMemos);
      if (cachedMemoVerses) setMemoVerses(new Set(cachedMemoVerses));
    })();

    void processSyncQueue();

    if (!isLoggedIn) return;
    getVerseInteractionState(translation, bookId, chapter)
      .then((state) => {
        if (cancelled) return;
        setHighlightRanges(state.highlightRanges);
        setWordMemos(state.wordMemos);
        setMemoVerses(new Set(state.memoVerseNumbers));
        idbSet(STORE_NAMES.highlights, hlKey, state.highlightRanges);
        idbSet(STORE_NAMES.wordMemos, hlKey, state.wordMemos);
        idbSet(STORE_NAMES.memoVerses, mvKey, state.memoVerseNumbers);
      })
      .catch((err) => {
        // 서버 갱신이 실패해도(오프라인 등) 위에서 이미 로컬 캐시로 화면을 채워놨으므로
        // 사용자에게는 크게 티가 안 난다.
        console.error("getVerseInteractionState failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, translation, bookId, chapter]);

  // 드래그로 텍스트를 선택하면(절 하나 안에서만) 하단 툴바를 "텍스트 선택" 모드로 바꾼다.
  useEffect(() => {
    function handleSelectionChange() {
      // 절 전체를 선택한 상태(번호/절 탭해서 선택)에서는 텍스트 드래그 선택을 아예
      // 무시한다 - 두 선택 모드가 동시에 활성화되면 툴바가 서로 충돌한다.
      if (mode === "selection") {
        window.getSelection()?.removeAllRanges();
        return;
      }

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
      idbSet(
        STORE_NAMES.highlights,
        `${translation}-${bookId}-${chapter}`,
        next,
      );
      return next;
    });

    enqueueSync("applyVerseHighlight", [
      bookId,
      chapter,
      translation,
      colorHex,
      targets.map((v) => ({ verse: v.verse, text: v.text, text2: v.text2 })),
    ]);
    clearSelection();
  }

  function handleRemoveWholeVerseHighlight() {
    if (selectedVerses.size === 0) return;
    const verseNums = [...selectedVerses];

    setHighlightRanges((prev) => {
      const next = { ...prev };
      for (const v of verseNums) {
        delete next[`${v}-0`];
        delete next[`${v}-1`];
      }
      idbSet(
        STORE_NAMES.highlights,
        `${translation}-${bookId}-${chapter}`,
        next,
      );
      return next;
    });

    enqueueSync("removeVerseHighlight", [
      bookId,
      chapter,
      verseNums,
      translation,
    ]);
    clearSelection();
  }

  function handleCopyVerses() {
    const targets = verses
      .filter((v) => selectedVerses.has(v.verse))
      .sort((a, b) => a.verse - b.verse);
    if (targets.length === 0) return;

    const book = getBook(bookId);
    const unit = chapterUnit(bookId);
    const body = targets
      .map((v) => `${v.verse}. ${v.text}${v.text2 ? " " + v.text2 : ""}`)
      .join("\n");
    const ref =
      targets.length === 1
        ? `${book?.name} ${chapter}${unit} ${targets[0].verse}절`
        : `${book?.name} ${chapter}${unit} ${targets[0].verse}~${targets[targets.length - 1].verse}절`;

    navigator.clipboard.writeText(`${body}\n(${ref})`);
    clearSelection();
  }

  function handleMemorizePlaceholder() {
    // 암송 그룹 선택 UI는 마이페이지의 암송 도메인 완성 후 연결합니다.
    alert("암송 기능은 마이페이지 완성 후 이어서 연결할게요.");
  }

  // 드래그로 선택한 부분에 하이라이트 (기존 것 안 지우고 추가)
  function handlePartialHighlightColor(colorHex: string) {
    if (!pendingSelection) return;
    const { verse, segment, start, end } = pendingSelection;

    setHighlightRanges((prev) => {
      const key = `${verse}-${segment}`;
      const next = { ...prev };
      next[key] = [
        ...(next[key] ?? []),
        { id: Date.now(), segment, start, end, colorHex },
      ];
      idbSet(
        STORE_NAMES.highlights,
        `${translation}-${bookId}-${chapter}`,
        next,
      );
      return next;
    });

    enqueueSync("applyPartialHighlight", [
      bookId,
      chapter,
      verse,
      translation,
      segment,
      start,
      end,
      colorHex,
    ]);
    clearSelection();
  }

  function handleRemovePartialHighlight() {
    if (!pendingSelection) return;
    const { verse, segment, start, end } = pendingSelection;

    setHighlightRanges((prev) => {
      const key = `${verse}-${segment}`;
      const next = { ...prev };
      next[key] = (next[key] ?? []).filter(
        (r) => end <= r.start || start >= r.end,
      );
      idbSet(
        STORE_NAMES.highlights,
        `${translation}-${bookId}-${chapter}`,
        next,
      );
      return next;
    });

    enqueueSync("removePartialHighlight", [
      bookId,
      chapter,
      verse,
      translation,
      segment,
      start,
      end,
    ]);
    clearSelection();
  }

  const hasExistingPartialHighlight = pendingSelection
    ? (
        highlightRanges[
          `${pendingSelection.verse}-${pendingSelection.segment}`
        ] ?? []
      ).some(
        (r) =>
          !(pendingSelection.end <= r.start || pendingSelection.start >= r.end),
      )
    : false;

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

    // 드래그한 범위와 정확히 일치하는 기존 메모는 전부 "같은 단어" 그룹(primary)으로,
    // 범위가 다른 것들만 "겹치는 기존 메모"로 분류한다.
    const exactMatches = overlapping.filter(
      (m) => m.startOffset === start && m.endOffset === end,
    );
    const restOverlapping = overlapping.filter(
      (m) => !(m.startOffset === start && m.endOffset === end),
    );

    const primaryBoxes: WordMemoBoxInput[] =
      exactMatches.length > 0
        ? exactMatches.map((m) => ({
            id: m.id,
            start: m.startOffset,
            end: m.endOffset,
            selectedText: fullText.slice(m.startOffset, m.endOffset),
            text: m.text,
            kind: "primary",
          }))
        : [
            {
              id: null,
              start,
              end,
              selectedText: fullText.slice(start, end),
              text: "",
              kind: "primary",
            },
          ];

    const boxes: WordMemoBoxInput[] = [
      ...primaryBoxes,
      ...restOverlapping.map((m) => ({
        id: m.id,
        start: m.startOffset,
        end: m.endOffset,
        selectedText: fullText.slice(m.startOffset, m.endOffset),
        text: m.text,
        kind: "overlapping" as const,
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
            <li key={verse.verse} id={`verse-${verse.verse}`}>
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
                  <p className="break-keep px-3 pt-3.5 pb-0 text-sm font-bold text-brown-dark">
                    [{bookPartLabel}]
                  </p>
                )}

                {verse.title && (
                  <p className="break-keep px-3 pt-2.5 pb-0 text-sm font-bold text-brown-primary">
                    &lt;{verse.title}&gt;
                  </p>
                )}

                <div
                  className={`flex gap-1 py-1 pb-2 pl-1.5 pr-3 ${extraTopSpacing ? "pt-3" : "pt-1"}`}
                >
                  <button
                    type="button"
                    onClick={(e) => handleNumberClick(verse.verse, e)}
                    className={`${numberColumnWidth} mt-[3px] shrink-0 cursor-pointer self-start text-center text-sm font-bold ${
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
                      className="break-keep select-text text-base leading-relaxed text-text-primary"
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
                      <p className="break-keep mt-1 text-15 leading-relaxed text-brown-light">
                        {secondaryFirstLine}
                      </p>
                    )}
                  </div>
                </div>

                {verse.title2 && (
                  <>
                    <p className="break-keep px-3 pb-0 text-sm font-bold text-brown-primary">
                      &lt;{verse.title2}&gt;
                    </p>
                    <div className="flex gap-1 py-1 pb-2 pl-1.5 pr-3">
                      <span className={`${numberColumnWidth} shrink-0`} />
                      <div className="flex-1">
                        <p
                          data-highlight-container
                          data-verse={verse.verse}
                          data-segment={1}
                          className="break-keep select-text text-base leading-relaxed text-text-primary"
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
                          <p className="break-keep mt-1 text-15 leading-relaxed text-brown-light">
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
        <div className="fixed inset-x-5 bottom-[60px] z-10 flex justify-center">
          <div
            data-no-swipe-nav
            className="scrollbar-hide flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-zinc-800 px-2 py-1 shadow-lg"
          >
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
              label="복사"
              onClick={handleCopyVerses}
              disabled={isPending}
            />
            <ToolbarButton
              label="하이라이트"
              onClick={() => setMode("colorPicker")}
              disabled={isPending}
            />
            {selectedVerses.size === 1 && (
              <ToolbarButton
                label="메모"
                onClick={() => {
                  const v = [...selectedVerses][0];
                  setMemoEditorVerse(v);
                  clearSelection();
                }}
                disabled={isPending}
              />
            )}
            <ToolbarButton
              label="스크랩"
              onClick={() => setShowScrapPicker(true)}
              disabled={isPending}
            />
            <ToolbarButton
              label="암송"
              onClick={handleMemorizePlaceholder}
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
        <div className="fixed inset-x-5 bottom-[60px] z-10 flex justify-center">
          <div
            data-no-swipe-nav
            className="scrollbar-hide flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-zinc-800 px-2 py-1 shadow-lg"
          >
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
          onRemove={
            hasExistingPartialHighlight
              ? handleRemovePartialHighlight
              : undefined
          }
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
          verseText={(() => {
            const v = verses.find((v) => v.verse === memoEditorVerse);
            return v ? (v.text2 ? `${v.text} ${v.text2}` : v.text) : "";
          })()}
          onClose={() => setMemoEditorVerse(null)}
          onChanged={() =>
            setMemoVerses((prev) => {
              const next = new Set(prev).add(memoEditorVerse);
              idbSet(STORE_NAMES.memoVerses, `${bookId}-${chapter}`, [...next]);
              return next;
            })
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
            setWordMemos((prev) => {
              const next = [...prev.filter((m) => m.id !== memo.id), memo];
              idbSet(
                STORE_NAMES.wordMemos,
                `${translation}-${bookId}-${chapter}`,
                next,
              );
              return next;
            });
          }}
          onDeleted={(id) => {
            setWordMemos((prev) => {
              const next = prev.filter((m) => m.id !== id);
              idbSet(
                STORE_NAMES.wordMemos,
                `${translation}-${bookId}-${chapter}`,
                next,
              );
              return next;
            });
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
      className="shrink-0 cursor-pointer whitespace-nowrap px-3 py-2 text-sm text-white disabled:cursor-default disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div className="h-6 w-px shrink-0 bg-white/20" />;
}
