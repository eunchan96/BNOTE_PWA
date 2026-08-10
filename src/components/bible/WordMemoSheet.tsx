"use client";

import {
  deleteWordMemo,
  propagateWordMemo,
  saveWordMemo,
  type WordMemoRow,
} from "@/lib/actions/bible/word-memos";
import { useState } from "react";
import { createPortal } from "react-dom";

type BoxKind = "primary" | "overlapping";

type Box = {
  id: number | null;
  start: number;
  end: number;
  selectedText: string;
  text: string;
  savedText: string;
  propagate: boolean;
  kind: BoxKind;
};

export type WordMemoBoxInput = {
  id: number | null;
  start: number;
  end: number;
  selectedText: string;
  text: string;
  kind: BoxKind;
};

export default function WordMemoSheet({
  bookId,
  chapter,
  verse,
  translation,
  segment,
  initialBoxes,
  onClose,
  onSaved,
  onDeleted,
}: {
  bookId: number;
  chapter: number;
  verse: number;
  translation: string;
  segment: number;
  initialBoxes: WordMemoBoxInput[];
  onClose: () => void;
  onSaved: (memo: WordMemoRow) => void;
  onDeleted: (id: number) => void;
}) {
  const [boxes, setBoxes] = useState<Box[]>(() => {
    const primary = initialBoxes.filter((b) => b.kind === "primary");
    const overlapping = [
      ...initialBoxes.filter((b) => b.kind === "overlapping"),
    ].sort((a, b) => (a.start !== b.start ? a.start - b.start : a.end - b.end));
    return [...primary, ...overlapping].map((b) => ({
      ...b,
      savedText: b.text,
      propagate: false,
    }));
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () =>
      new Set(
        initialBoxes
          .filter((b) => b.kind === "overlapping")
          .map((b) => `${b.start}-${b.end}`),
      ),
  );
  const [isSaving, setIsSaving] = useState(false);

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function updateText(index: number, text: string) {
    setBoxes((prev) => prev.map((b, i) => (i === index ? { ...b, text } : b)));
  }

  function addBox() {
    const base = boxes[0];
    const insertAt = boxes.findIndex((b) => b.kind === "overlapping");
    const newBox: Box = {
      id: null,
      start: base.start,
      end: base.end,
      selectedText: base.selectedText,
      text: "",
      savedText: "",
      propagate: false,
      kind: "primary",
    };
    setBoxes((prev) => {
      if (insertAt === -1) return [...prev, newBox];
      const next = [...prev];
      next.splice(insertAt, 0, newBox);
      return next;
    });
  }

  async function handleDelete(index: number) {
    const box = boxes[index];
    if (box.id === null) {
      setBoxes((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (!confirm("이 메모를 삭제할까요?")) return;
    await deleteWordMemo(box.id, bookId, chapter);
    onDeleted(box.id);
    setBoxes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveAll() {
    const changed = boxes
      .map((box, index) => ({ box, index }))
      .filter(
        ({ box }) => box.text.trim() !== "" && box.text !== box.savedText,
      );

    if (changed.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    let propagatedTotal = 0;

    for (const { box, index } of changed) {
      const saved = await saveWordMemo(
        box.id,
        bookId,
        chapter,
        verse,
        translation,
        segment,
        box.start,
        box.end,
        box.text,
      );
      onSaved(saved);
      setBoxes((prev) =>
        prev.map((b, i) =>
          i === index ? { ...b, id: saved.id, savedText: box.text } : b,
        ),
      );

      if (box.propagate) {
        const count = await propagateWordMemo(
          translation,
          box.selectedText,
          box.text,
          bookId,
          chapter,
          verse,
        );
        propagatedTotal += count;
      }
    }

    setIsSaving(false);
    if (propagatedTotal > 0) {
      alert(`저장됐고, ${propagatedTotal}개 구절에도 추가됐어요`);
    }
    onClose();
  }

  const firstOverlappingIndex = boxes.findIndex(
    (b) => b.kind === "overlapping",
  );

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
          <h2 className="flex-1 text-lg font-bold text-zinc-900">단어 메모</h2>
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

        <div className="flex-1 overflow-y-auto p-4">
          {boxes[0] && (
            <p className="mb-2 rounded-lg bg-zinc-50 p-2.5 text-[14px] text-text-primary">
              {boxes[0].selectedText}
            </p>
          )}

          {(() => {
            const renderedGroups = new Set<string>();

            return boxes.map((box, index) => {
              const groupKey = `${box.start}-${box.end}`;
              const isOverlap = box.kind === "overlapping";
              const isFirstOfGroup = isOverlap && !renderedGroups.has(groupKey);
              if (isFirstOfGroup) renderedGroups.add(groupKey);
              const isCollapsed = isOverlap && collapsedGroups.has(groupKey);

              return (
                <div key={box.id ?? `new-${index}`}>
                  {index === firstOverlappingIndex && index > 0 && (
                    <p className="mb-2 mt-1 text-[13px] font-bold text-brown-primary">
                      선택한 부분과 겹치는 기존 메모
                    </p>
                  )}

                  {isFirstOfGroup && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupKey)}
                      className="mb-1.5 flex w-full cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-50 p-2.5 text-left text-[14px] text-text-primary"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className={`shrink-0 text-zinc-400 transition-transform ${
                          isCollapsed ? "" : "rotate-90"
                        }`}
                      >
                        <path d="M8.59,16.59L13.17,12 8.59,7.41 10,6l6,6 -6,6z" />
                      </svg>
                      <span className="flex-1 truncate">
                        {box.selectedText}
                      </span>
                    </button>
                  )}

                  {(box.kind === "primary" || !isCollapsed) && (
                    <div className="mb-4 rounded-lg border border-divider">
                      <textarea
                        value={box.text}
                        onChange={(e) => updateText(index, e.target.value)}
                        placeholder="메모"
                        autoFocus={index === 0}
                        className="min-h-[100px] w-full resize-none p-3 text-[15px] outline-none"
                      />
                      <div className="flex items-center justify-between px-2 pb-1">
                        <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-text-secondary">
                          <input
                            type="checkbox"
                            checked={box.propagate}
                            onChange={(e) =>
                              setBoxes((prev) =>
                                prev.map((b, i) =>
                                  i === index
                                    ? { ...b, propagate: e.target.checked }
                                    : b,
                                ),
                              )
                            }
                          />
                          다른 구절에도 추가
                        </label>
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
                  )}
                </div>
              );
            });
          })()}
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
