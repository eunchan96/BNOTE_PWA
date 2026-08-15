"use client";

import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";
import { useState } from "react";
import { createPortal } from "react-dom";

export default function PromptDialog({
  title,
  initialValue = "",
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  initialValue?: string;
  confirmLabel: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);

  useLockBodyScroll();

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/40"
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">{title}</h2>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="그룹 이름"
          autoFocus
          className="w-full rounded-lg border border-divider p-3 text-base"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-4 py-2 text-sm text-zinc-500"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              if (value.trim()) {
                onConfirm(value.trim());
                onClose();
              }
            }}
            className="cursor-pointer rounded-lg bg-brown-primary px-4 py-2 text-sm text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
