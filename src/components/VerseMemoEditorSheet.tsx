"use client";

import {
  deleteVerseMemo,
  getVerseMemos,
  saveVerseMemo,
  type VerseMemoRow,
} from "@/lib/actions/verse-memos";
import { chapterUnit, getBook } from "@/lib/bible-books";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Box = { id: number | null; text: string; savedText: string };

export default function VerseMemoEditorSheet({
  bookId,
  chapter,
  verse,
  verseText,
  onClose,
  onChanged,
}: {
  bookId: number;
  chapter: number;
  verse: number;
  verseText: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getVerseMemos(bookId, chapter, verse).then((memos: VerseMemoRow[]) => {
      setBoxes(
        memos.length > 0
          ? memos.map((m) => ({ id: m.id, text: m.text, savedText: m.text }))
          : [{ id: null, text: "", savedText: "" }],
      );
      setLoaded(true);
    });
  }, [bookId, chapter, verse]);

  function updateText(index: number, text: string) {
    setBoxes((prev) => prev.map((b, i) => (i === index ? { ...b, text } : b)));
  }

  function addBox() {
    setBoxes((prev) => [...prev, { id: null, text: "", savedText: "" }]);
  }

  async function handleDelete(index: number) {
    const box = boxes[index];
    if (box.id === null) {
      setBoxes((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (!confirm("이 메모를 삭제할까요?")) return;
    await deleteVerseMemo(box.id, bookId, chapter);
    setBoxes((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ id: null, text: "", savedText: "" }];
    });
    onChanged();
  }

  async function handleSaveAll() {
    const changedBoxes = boxes
      .map((box, index) => ({ box, index }))
      .filter(
        ({ box }) => box.text.trim() !== "" && box.text !== box.savedText,
      );

    if (changedBoxes.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    const updated = [...boxes];
    for (const { box, index } of changedBoxes) {
      const savedId = await saveVerseMemo(
        box.id,
        bookId,
        chapter,
        verse,
        box.text,
      );
      updated[index] = { id: savedId, text: box.text, savedText: box.text };
    }
    setBoxes(updated);
    setIsSaving(false);
    onChanged();
    onClose();
  }

  const book = getBook(bookId);
  const unit = chapterUnit(bookId);

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/40"
      />

      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white">
        <div className="flex items-center px-4 pt-4 pb-2">
          <h2 className="flex-1 truncate text-lg font-bold text-zinc-900">
            {book?.name} {chapter}
            {unit} {verse}절 메모
          </h2>
          <button
            type="button"
            onClick={addBox}
            aria-label="메모 추가"
            className="flex h-9 w-9 cursor-pointer items-center justify-center text-brown-primary"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 cursor-pointer items-center justify-center text-zinc-400"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12z" />
            </svg>
          </button>
        </div>
        <p className="px-4 pb-3 text-sm text-text-secondary">{verseText}</p>
        <div className="border-t border-divider" />

        <div className="flex-1 overflow-y-auto p-4">
          {!loaded && (
            <p className="p-6 text-center text-sm text-text-secondary">
              불러오는 중...
            </p>
          )}

          {loaded &&
            boxes.map((box, index) => (
              <div
                key={box.id ?? `new-${index}`}
                className="mb-3 rounded-lg border border-divider"
              >
                <textarea
                  value={box.text}
                  onChange={(e) => updateText(index, e.target.value)}
                  placeholder="메모"
                  className="min-h-[140px] w-full resize-none p-3 text-[15px] outline-none"
                />
                <div className="flex items-center justify-end px-2 pb-1">
                  <button
                    type="button"
                    onClick={() => handleDelete(index)}
                    aria-label="삭제"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center text-zinc-400"
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
                </div>
              </div>
            ))}
        </div>

        <div className="border-t border-divider p-4">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="w-full cursor-pointer rounded-lg bg-brown-primary py-3 text-center font-medium text-white disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
