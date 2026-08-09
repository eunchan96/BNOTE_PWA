"use client";

import { BIBLE_BOOKS, chapterUnit, getBook } from "@/lib/bible/bible-books";
import type { BibleRefInput } from "@/lib/actions/sermon/sermons";
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

  function tapVerse(v: number) {
    if (startVerse === null) {
      setStartVerse(v);
      return;
    }
    const start = Math.min(startVerse, v);
    const end = Math.max(startVerse, v);
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

  function confirmSingle(v: number) {
    onSelect({
      startBookId: bookId,
      startChapter: chapter,
      startVerse: v,
      endBookId: bookId,
      endChapter: chapter,
      endVerse: v,
    });
    onClose();
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
      <div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white pb-4">
        <div className="flex items-center px-4 pt-4 pb-2">
          <h2 className="flex-1 text-lg font-bold text-zinc-900">{title}</h2>
          {existing && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              aria-label="삭제"
              className="flex h-9 w-9 cursor-pointer items-center justify-center text-red-400"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6,19c0,1.1 0.9,2 2,2h8c1.1,0 2,-0.9 2,-2V7H6V19zM19,4h-3.5l-1,-1h-5l-1,1H5v2h14V4z" />
              </svg>
            </button>
          )}
        </div>

        <p className="px-4 pb-2 text-xs text-text-secondary">
          같은 장 안에서 시작 절과 끝 절을 순서대로 탭해주세요 (한 절만 쓰려면 같은 절을 두 번).
          {startVerse !== null && ` 시작: ${startVerse}절 선택됨`}
        </p>

        <div className="flex px-2">
          <PickerTab label="성경" selected={step === "book"} onClick={() => setStep("book")} />
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

        <div className="h-[400px] overflow-y-auto p-2">
          {step === "book" && (
            <div className="grid grid-cols-4 gap-2 p-1">
              {BIBLE_BOOKS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => pickBook(b.id)}
                  className={`cursor-pointer rounded-lg px-1 py-3 text-center text-[13px] ${
                    b.id === bookId ? "bg-brown-primary text-white" : "bg-zinc-100 text-zinc-800"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {step === "chapter" && book && (
            <div className="grid grid-cols-5 gap-2 p-1">
              {Array.from({ length: book.chapterCount }, (_, i) => i + 1).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => pickChapter(c)}
                  className={`flex h-11 cursor-pointer items-center justify-center rounded-lg text-sm ${
                    c === chapter ? "bg-brown-primary text-white" : "bg-zinc-100 text-zinc-800"
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
              chapter={chapter}
              startVerse={startVerse}
              onTap={existing && startVerse === null ? tapVerse : tapVerse}
              onConfirmSingle={confirmSingle}
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
  onConfirmSingle: (v: number) => void;
}) {
  const [count, setCount] = useState<number | null>(null);

  useState(() => {
    import("@/lib/actions/bible/bible-queries").then(({ getVerseCounts }) => {
      getVerseCounts("NKRV").then((table) => {
        setCount(table[`${bookId}-${chapter}`] ?? 0);
      });
    });
  });

  if (count === null) {
    return <p className="p-6 text-center text-sm text-text-secondary">불러오는 중...</p>;
  }

  return (
    <div className="grid grid-cols-5 gap-2 p-1">
      {Array.from({ length: count }, (_, i) => i + 1).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onTap(v)}
          className={`flex h-11 cursor-pointer items-center justify-center rounded-lg text-sm ${
            v === startVerse ? "bg-brown-primary text-white" : "bg-zinc-100 text-zinc-800"
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