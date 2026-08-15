"use client";

import { getVerseCounts } from "@/lib/actions/bible/bible-queries";
import { BIBLE_BOOKS, chapterUnit, getBook } from "@/lib/bible/bible-books";
import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Step = "book" | "chapter" | "verse";

export default function BookChapterPickerSheet({
  onClose,
  initialBookId,
  translation,
  secondary,
}: {
  onClose: () => void;
  initialBookId: number;
  translation: string;
  secondary?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("book");
  const [selectedBookId, setSelectedBookId] = useState(initialBookId);
  const [selectedChapter, setSelectedChapter] = useState(-1);
  const [verseCounts, setVerseCounts] = useState<Record<string, number> | null>(
    null,
  );

  useEffect(() => {
    getVerseCounts(translation).then(setVerseCounts);
  }, [translation]);

  const selectedBook =
    selectedBookId !== -1 ? getBook(selectedBookId) : undefined;

  const verseNumbers =
    verseCounts && selectedBookId !== -1 && selectedChapter !== -1
      ? Array.from(
          { length: verseCounts[`${selectedBookId}-${selectedChapter}`] ?? 0 },
          (_, i) => i + 1,
        )
      : [];

  function title() {
    if (!selectedBook) return "책 선택";
    const unit = chapterUnit(selectedBook.id);
    const chapterLabel =
      selectedChapter !== -1 ? `${selectedChapter}${unit}` : `_${unit}`;
    return `${selectedBook.name} ${chapterLabel} _절`;
  }

  function pickBook(bookId: number) {
    setSelectedBookId(bookId);
    setSelectedChapter(-1);
    setStep("chapter");
  }

  function pickChapter(chapter: number) {
    setSelectedChapter(chapter);
    setStep("verse");
  }

  function pickVerse(verse: number) {
    const suffix = secondary ? `&secondary=${secondary}` : "";
    router.push(
      `/bible/${selectedBookId}/${selectedChapter}?translation=${translation}&verse=${verse}${suffix}`,
    );
    onClose();
  }

  useLockBodyScroll();

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 cursor-pointer"
      />

      <div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white pb-4">
        <div className="flex items-center px-4 pt-4 pb-2">
          <h2 className="flex-1 text-lg font-bold text-zinc-900">{title()}</h2>
        </div>

        <div className="flex px-2">
          <PickerTab
            label="성경"
            enabled
            selected={step === "book"}
            onClick={() => setStep("book")}
          />
          <PickerTab
            label="장"
            enabled={selectedBookId !== -1}
            selected={step === "chapter"}
            onClick={() => selectedBookId !== -1 && setStep("chapter")}
          />
          <PickerTab
            label="절"
            enabled={selectedChapter !== -1}
            selected={step === "verse"}
            onClick={() => selectedChapter !== -1 && setStep("verse")}
          />
        </div>

        <div className="border-t border-divider" />

        <div key={step} className="h-[420px] overflow-y-auto p-2">
          {step === "book" && (
            <div className="flex flex-col gap-2 p-1">
              <div className="grid grid-cols-4 gap-2">
                {BIBLE_BOOKS.slice(0, 39).map((book) => {
                  const isSelected = book.id === selectedBookId;
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => pickBook(book.id)}
                      className={`cursor-pointer rounded-lg px-1 py-4 text-center text-[13px] ${
                        isSelected
                          ? "bg-brown-primary text-white"
                          : "bg-input-background text-text-primary"
                      }`}
                    >
                      {book.name}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {BIBLE_BOOKS.slice(39).map((book) => {
                  const isSelected = book.id === selectedBookId;
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => pickBook(book.id)}
                      className={`cursor-pointer rounded-lg px-1 py-4 text-center text-[13px] ${
                        isSelected
                          ? "bg-brown-primary text-white"
                          : "bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      {book.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "chapter" && selectedBook && (
            <NumberGrid
              items={Array.from(
                { length: selectedBook.chapterCount },
                (_, i) => i + 1,
              )}
              selected={selectedChapter}
              onSelect={pickChapter}
            />
          )}

          {step === "verse" && (
            <NumberGrid
              items={verseNumbers}
              selected={-1}
              onSelect={pickVerse}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PickerTab({
  label,
  enabled,
  selected,
  onClick,
}: {
  label: string;
  enabled: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const color = selected
    ? "text-brown-primary"
    : enabled
      ? "text-zinc-500"
      : "text-nav-unselected";
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className={`flex-1 border-b-2 py-3 text-[15px] ${color} ${
        selected ? "border-brown-primary font-bold" : "border-transparent"
      } cursor-pointer`}
    >
      {label}
    </button>
  );
}

function NumberGrid({
  items,
  selected,
  onSelect,
}: {
  items: number[];
  selected: number;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 p-1">
      {items.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={`flex h-12 items-center justify-center rounded-lg text-sm ${
            value === selected
              ? "bg-brown-primary text-white"
              : "bg-input-background text-text-primary"
          } cursor-pointer`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
