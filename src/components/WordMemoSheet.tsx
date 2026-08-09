"use client";

import { deleteWordMemo, saveWordMemo, type WordMemoRow } from "@/lib/actions/word-memos";
import { useState } from "react";
import { createPortal } from "react-dom";

export default function WordMemoSheet({
  bookId,
  chapter,
  verse,
  translation,
  segment,
  start,
  end,
  selectedText,
  existing,
  onClose,
  onSaved,
  onDeleted,
}: {
  bookId: number;
  chapter: number;
  verse: number;
  translation: string;
  segment: number;
  start: number;
  end: number;
  selectedText: string;
  existing: WordMemoRow | null;
  onClose: () => void;
  onSaved: (memo: WordMemoRow) => void;
  onDeleted: (id: number) => void;
}) {
  const [text, setText] = useState(existing?.text ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (text.trim() === "") {
      alert("메모 내용을 입력해주세요");
      return;
    }
    setIsSaving(true);
    const saved = await saveWordMemo(
      existing?.id ?? null,
      bookId,
      chapter,
      verse,
      translation,
      segment,
      start,
      end,
      text,
    );
    setIsSaving(false);
    onSaved(saved);
    onClose();
  }

  async function handleDelete() {
    if (!existing) return;
    if (!confirm("이 메모를 삭제할까요?")) return;
    await deleteWordMemo(existing.id, bookId, chapter);
    onDeleted(existing.id);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/40"
      />

      <div className="relative flex w-full max-w-2xl flex-col rounded-t-2xl bg-white p-4">
        <div className="mb-2 flex items-center">
          <h2 className="flex-1 text-lg font-bold text-zinc-900">단어 메모</h2>
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
        <p className="mb-3 rounded-lg bg-zinc-50 p-3 text-[15px] text-text-primary">
          {selectedText}
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="메모"
          autoFocus
          className="min-h-[120px] w-full resize-none rounded-lg border border-divider p-3 text-[15px] outline-none"
        />

        <div className="mt-3 flex gap-2">
          {existing && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 cursor-pointer rounded-lg border border-divider py-3 text-center text-sm text-red-500"
            >
              삭제
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 cursor-pointer rounded-lg bg-brown-primary py-3 text-center text-sm font-medium text-white disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}