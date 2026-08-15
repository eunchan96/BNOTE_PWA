"use client";

import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";
import { useState } from "react";
import { createPortal } from "react-dom";

export default function MonthYearPickerSheet({
  initialYear,
  onSelect,
  onClose,
}: {
  initialYear: number;
  onSelect: (year: number, month0: number) => void;
  onClose: () => void;
}) {
  const [year, setYear] = useState(initialYear);

  useLockBodyScroll();

  return createPortal(
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/40"
      />
      <div className="relative w-full max-w-2xl rounded-t-2xl bg-white pb-4">
        <div className="flex items-center justify-center gap-6 py-4">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            className="cursor-pointer text-lg text-zinc-400"
          >
            ‹
          </button>
          <span className="text-lg font-bold text-zinc-900">{year}년</span>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            className="cursor-pointer text-lg text-zinc-400"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4">
          {Array.from({ length: 12 }, (_, i) => i).map((month0) => (
            <button
              key={month0}
              type="button"
              onClick={() => {
                onSelect(year, month0);
                onClose();
              }}
              className="cursor-pointer rounded-lg bg-zinc-100 py-4 text-center text-[15px] text-zinc-800"
            >
              {month0 + 1}월
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
