"use client";

import type { BibleRefInput } from "@/lib/actions/sermon/sermons";
import { BIBLE_BOOKS, chapterUnit, getBook } from "@/lib/bible/bible-books";
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
  const [step, setStep] = useState<Step>(existing ? "verse" : "book");
  const [bookId, setBookId] = useState(existing?.startBookId ?? -1);
  const [chapter, setChapter] = useState(existing?.startChapter ?? -1);
  const [startVerse, setStartVerse] = useState<number | null>(null);
  const [isMultiMode, setIsMultiMode] = useState(true);

  const book = bookId !== -1 ? getBook(bookId) : undefined;
  const unit = bookId !== -1 ? chapterUnit(bookId) : "장";

  function pickBook(id: number) {
    setBookId(id);
    setChapter(-1);
    setStartVerse(null);
    setStep("chapter");
  }

  function pickChapter(c: number) {
    setChapter(c);
    setStartVerse(null);
    setStep("verse");
  }

  function finalize(start: number, end: number) {
    onSelect({
      startBookId: bookId,
      startChapter: chapter,
      startVerse: start,
      endBookId: bookId,
      endChapter: chapter,
      endVerse: end,
    });
    onClose();
  }

  function tapVerse(v: number) {
    if (!isMultiMode) {
      finalize(v, v);
      return;
    }
    if (startVerse === null) {
      setStartVerse(v);
      return;
    }
    finalize(Math.min(startVerse, v), Math.max(startVerse, v));
  }

  const title =
    bookId === -1
      ? "책 선택"
      : `${book?.name} ${chapter !== -1 ? `${chapter}${unit}` : `_${unit}`} _절`;

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
                setStartVerse(null);
              }}
            />
            여러 구절 선택하기
          </label>
          <label className="flex cursor-not-allowed items-center gap-1.5 px-1 py-1 text-sm text-text-secondary opacity-40">
            <input type="checkbox" disabled />
            다음 장까지 선택하기
          </label>
        </div>
        {startVerse !== null && (
          <p className="px-4 pb-1 text-sm font-bold text-brown-primary">
            {book?.name} {chapter}
            {unit} {startVerse}절~
          </p>
        )}

        <div className="flex px-2">
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
            enabled={chapter !== -1}
            selected={step === "verse"}
            onClick={() => chapter !== -1 && setStep("verse")}
          />
        </div>
        <div className="border-t border-divider" />

        <div className="h-[420px] overflow-y-auto p-2">
          {step === "book" && (
            <div className="grid grid-cols-4 gap-2 p-1">
              {BIBLE_BOOKS.map((b) => (
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
          )}

          {step === "chapter" && book && (
            <div className="grid grid-cols-5 gap-2 p-1">
              {Array.from({ length: book.chapterCount }, (_, i) => i + 1).map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pickChapter(c)}
                    className={`flex h-11 cursor-pointer items-center justify-center rounded-lg text-sm ${
                      c === chapter
                        ? "bg-brown-primary text-white"
                        : "bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {c}
                  </button>
                ),
              )}
            </div>
          )}

          {step === "verse" && (
            <VerseGrid
              bookId={bookId}
              chapter={chapter}
              startVerse={startVerse}
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
  startVerse,
  onTap,
}: {
  bookId: number;
  chapter: number;
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
      {Array.from({ length: count }, (_, i) => i + 1).map((v) => (
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
