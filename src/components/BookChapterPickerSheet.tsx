"use client";

import { getVerseNumbers } from "@/lib/actions/bible-queries";
import { BIBLE_BOOKS, chapterUnit, getBook } from "@/lib/bible-books";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "book" | "chapter" | "verse";

function bookGroups(): number[][] {
  const groups: number[][] = [];
  for (let i = 1; i <= 39; i += 4) {
    groups.push(BIBLE_BOOKS.slice(i - 1, Math.min(i + 3, 39)).map((b) => b.id));
  }
  for (let i = 40; i <= 66; i += 4) {
    groups.push(BIBLE_BOOKS.slice(i - 1, Math.min(i + 3, 66)).map((b) => b.id));
  }
  return groups;
}

export default function BookChapterPickerSheet({
  onClose,
  initialBookId,
  translation,
}: {
  onClose: () => void;
  initialBookId: number;
  translation: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("book");
  const [selectedBookId, setSelectedBookId] = useState(initialBookId);
  const [selectedChapter, setSelectedChapter] = useState(-1);
  const [verseNumbers, setVerseNumbers] = useState<number[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);

  const selectedBook =
    selectedBookId !== -1 ? getBook(selectedBookId) : undefined;

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
    setLoadingVerses(true);
    getVerseNumbers(selectedBookId, chapter, translation)
      .then((numbers) => setVerseNumbers(numbers))
      .finally(() => setLoadingVerses(false));
  }

  function pickVerse(verse: number) {
    router.push(
      `/bible/${selectedBookId}/${selectedChapter}?translation=${translation}&verse=${verse}`,
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
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

        <div className="h-[420px] overflow-y-auto p-2">
          {step === "book" && (
            <div className="flex flex-col gap-2 p-1">
              {bookGroups().map((group, i) => (
                <div key={i} className="flex gap-2">
                  {group.map((bookId) => {
                    const book = getBook(bookId)!;
                    const isSelected = bookId === selectedBookId;
                    return (
                      <button
                        key={bookId}
                        type="button"
                        onClick={() => pickBook(bookId)}
                        className={`flex-1 rounded-lg px-1 py-4 text-center text-[13px] ${
                          isSelected
                            ? "bg-brown-primary text-white"
                            : "bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        {book.name}
                      </button>
                    );
                  })}
                  {Array.from({ length: 4 - group.length }).map((_, i) => (
                    <div key={`spacer-${i}`} className="flex-1" />
                  ))}
                </div>
              ))}
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

          {step === "verse" &&
            (loadingVerses ? (
              <p className="p-4 text-center text-sm text-zinc-400">
                불러오는 중...
              </p>
            ) : (
              <NumberGrid
                items={verseNumbers}
                selected={-1}
                onSelect={pickVerse}
              />
            ))}
        </div>
      </div>
    </div>
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
      }`}
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
          className={`flex h-11 items-center justify-center rounded-lg text-sm ${
            value === selected
              ? "bg-brown-primary text-white"
              : "bg-zinc-100 text-zinc-800"
          }`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
