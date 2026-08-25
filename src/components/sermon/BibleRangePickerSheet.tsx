"use client";

import type { BibleRefInput } from "@/lib/actions/sermon/sermons";
import { BIBLE_BOOKS, chapterUnit, getBook } from "@/lib/bible/bible-books";
import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";
import { useState } from "react";
import { createPortal } from "react-dom";

type Step = "book" | "chapter" | "verse";

export default function BibleRangePickerSheet({
  existing,
  onSelect,
  onDelete,
  onClose,
}: {
  existing: BibleRefInput | null;
  onSelect: (ref: BibleRefInput) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  // 안드로이드 원본과 동일하게, 편집 모드로 열어도 항상 "책 선택" 단계부터 시작한다.
  const [step, setStep] = useState<Step>("book");
  const [bookId, setBookId] = useState(existing?.startBookId ?? -1);
  const [startChapter, setStartChapter] = useState(
    existing?.startChapter ?? -1,
  );
  const [startVerse, setStartVerse] = useState<number | null>(null);
  const [isMultiMode, setIsMultiMode] = useState(true);
  const [crossChapter, setCrossChapter] = useState(false);
  const [isSelectingEnd, setIsSelectingEnd] = useState(false);
  const [endChapter, setEndChapter] = useState(-1);

  const book = bookId !== -1 ? getBook(bookId) : undefined;
  const unit = bookId !== -1 ? chapterUnit(bookId) : "장";
  const showEndUI = isMultiMode && crossChapter && isSelectingEnd;

  function resetSelection() {
    setStartVerse(null);
    setIsSelectingEnd(false);
    setEndChapter(-1);
  }

  function pickBook(id: number) {
    setBookId(id);
    setStartChapter(-1);
    resetSelection();
    setStep("chapter");
  }

  function pickChapter(c: number) {
    if (showEndUI) {
      setEndChapter(c);
      setStep("verse");
    } else {
      setStartChapter(c);
      setStartVerse(null);
      setStep("verse");
    }
  }

  function finalize(
    sChapter: number,
    sVerse: number,
    eChapter: number,
    eVerse: number,
  ) {
    onSelect({
      startBookId: bookId,
      startChapter: sChapter,
      startVerse: sVerse,
      endBookId: bookId,
      endChapter: eChapter,
      endVerse: eVerse,
    });
    onClose();
  }

  function tapVerse(v: number) {
    if (!isMultiMode) {
      finalize(startChapter, v, startChapter, v);
      return;
    }

    if (crossChapter) {
      if (!isSelectingEnd) {
        setStartVerse(v);
        setIsSelectingEnd(true);
        setStep("chapter");
      } else {
        finalize(startChapter, startVerse!, endChapter, v);
      }
      return;
    }

    // 같은 장 안에서 직접 두 번 탭
    if (startVerse === null) {
      setStartVerse(v);
    } else {
      finalize(
        startChapter,
        Math.min(startVerse, v),
        startChapter,
        Math.max(startVerse, v),
      );
    }
  }

  const title = (() => {
    if (bookId === -1) return "책 선택";
    if (startVerse !== null) {
      // 시작 절을 정한 뒤로는 끝 구간을 고르는 동안 계속 "~" 상태를 보여준다.
      return `${book?.name} ${startChapter}${unit} ${startVerse}절~`;
    }
    const chapterLabel =
      startChapter !== -1 ? `${startChapter}${unit}` : `_${unit}`;
    return `${book?.name} ${chapterLabel} _절`;
  })();

  useLockBodyScroll();

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/40"
      />
      <div className="relative flex w-full max-w-2xl flex-col rounded-t-2xl bg-white pb-4">
        <div className="flex items-center gap-1 px-4 pb-1 pt-4">
          <h2 className="flex-1 text-lg font-bold text-zinc-900">{title}</h2>
          {existing && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              aria-label="삭제"
              className="flex h-10 w-10 cursor-pointer items-center justify-center text-red-400"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6,19c0,1.1 0.9,2 2,2h8c1.1,0 2,-0.9 2,-2V7H6V19zM19,4h-3.5l-1,-1h-5l-1,1H5v2h14V4z" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 px-3 pb-1">
          <label className="flex cursor-pointer items-center gap-1.5 px-1 py-1 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={isMultiMode}
              onChange={(e) => {
                setIsMultiMode(e.target.checked);
                if (!e.target.checked) setCrossChapter(false);
                resetSelection();
              }}
            />
            여러 구절 선택하기
          </label>
          {isMultiMode && (
            <label className="flex cursor-pointer items-center gap-1.5 px-1 py-1 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={crossChapter}
                onChange={(e) => {
                  setCrossChapter(e.target.checked);
                  resetSelection();
                }}
              />
              다음 장까지 선택하기
            </label>
          )}
        </div>

        <div className="flex px-2">
          {showEndUI ? (
            <>
              <PickerTab
                label="장"
                selected={step === "chapter"}
                onClick={() => setStep("chapter")}
              />
              <PickerTab
                label="절"
                enabled={endChapter !== -1}
                selected={step === "verse"}
                onClick={() => endChapter !== -1 && setStep("verse")}
              />
            </>
          ) : (
            <>
              <PickerTab
                label="성경"
                selected={step === "book"}
                onClick={() => setStep("book")}
              />
              <PickerTab
                label="장"
                enabled={bookId !== -1}
                selected={step === "chapter"}
                onClick={() => bookId !== -1 && setStep("chapter")}
              />
              <PickerTab
                label="절"
                enabled={startChapter !== -1}
                selected={step === "verse"}
                onClick={() => startChapter !== -1 && setStep("verse")}
              />
            </>
          )}
        </div>
        <div className="border-t border-divider" />

        <div className="h-[420px] overflow-y-auto p-2">
          {step === "book" && !showEndUI && (
            <div className="flex flex-col gap-2 p-1">
              <div className="grid grid-cols-4 gap-2">
                {BIBLE_BOOKS.slice(0, 39).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => pickBook(b.id)}
                    className={`cursor-pointer rounded-lg px-1 py-3 text-center text-[13px] ${
                      b.id === bookId
                        ? "bg-brown-primary text-white"
                        : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {BIBLE_BOOKS.slice(39).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => pickBook(b.id)}
                    className={`cursor-pointer rounded-lg px-1 py-3 text-center text-[13px] ${
                      b.id === bookId
                        ? "bg-brown-primary text-white"
                        : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "chapter" && book && (
            <div className="grid grid-cols-5 gap-2 p-1">
              {Array.from({ length: book.chapterCount }, (_, i) => i + 1)
                .filter((c) => !showEndUI || c >= startChapter)
                .map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pickChapter(c)}
                    className={`flex h-11 cursor-pointer items-center justify-center rounded-lg text-sm ${
                      c === (showEndUI ? endChapter : startChapter)
                        ? "bg-brown-primary text-white"
                        : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {c}
                  </button>
                ))}
            </div>
          )}

          {step === "verse" && (
            <VerseGrid
              bookId={bookId}
              chapter={showEndUI ? endChapter : startChapter}
              minVerse={
                showEndUI && endChapter === startChapter ? (startVerse ?? 1) : 1
              }
              startVerse={!crossChapter ? startVerse : null}
              onTap={tapVerse}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function VerseGrid({
  bookId,
  chapter,
  minVerse,
  startVerse,
  onTap,
}: {
  bookId: number;
  chapter: number;
  minVerse: number;
  startVerse: number | null;
  onTap: (v: number) => void;
}) {
  const [count, setCount] = useState<number | null>(null);

  if (count === null) {
    import("@/lib/actions/bible/bible-queries").then(({ getVerseCounts }) => {
      getVerseCounts("NKRV").then((table) =>
        setCount(table[`${bookId}-${chapter}`] ?? 0),
      );
    });
    return (
      <p className="p-6 text-center text-sm text-text-secondary">
        불러오는 중...
      </p>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2 p-1">
      {Array.from({ length: count }, (_, i) => i + 1)
        .filter((v) => v >= minVerse)
        .map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onTap(v)}
            className={`flex h-11 cursor-pointer items-center justify-center rounded-lg text-sm ${
              v === startVerse
                ? "bg-brown-primary text-white"
                : "bg-zinc-100 text-zinc-800"
            }`}
          >
            {v}
          </button>
        ))}
    </div>
  );
}

function PickerTab({
  label,
  enabled = true,
  selected,
  onClick,
}: {
  label: string;
  enabled?: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className={`flex-1 cursor-pointer border-b-2 py-3 text-[15px] ${
        selected
          ? "border-brown-primary font-bold text-brown-primary"
          : enabled
            ? "border-transparent text-zinc-500"
            : "border-transparent text-nav-unselected"
      }`}
    >
      {label}
    </button>
  );
}
