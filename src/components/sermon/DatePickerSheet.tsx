"use client";

import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";
import { useState } from "react";
import { createPortal } from "react-dom";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DatePickerSheet({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}) {
  const initial = value ? new Date(value) : new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month0, setMonth0] = useState(initial.getMonth());

  const firstOfMonth = new Date(year, month0, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const gridStart = new Date(year, month0, 1 - startOffset);

  const days = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return {
      dateStr: toDateStr(d),
      dayOfMonth: d.getDate(),
      isCurrentMonth: d.getMonth() === month0,
    };
  });

  function goToPrevMonth() {
    if (month0 === 0) {
      setYear((y) => y - 1);
      setMonth0(11);
    } else {
      setMonth0((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month0 === 11) {
      setYear((y) => y + 1);
      setMonth0(0);
    } else {
      setMonth0((m) => m + 1);
    }
  }

  useLockBodyScroll();

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center">
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
            onClick={goToPrevMonth}
            className="cursor-pointer p-2 text-lg text-zinc-400"
          >
            ‹
          </button>
          <span className="text-[17px] font-bold text-text-primary">
            {year}년 {month0 + 1}월
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="cursor-pointer p-2 text-lg text-zinc-400"
          >
            ›
          </button>
        </div>

        <div className="flex px-2">
          {["일", "월", "화", "수", "목", "금", "토"].map((label, i) => (
            <span
              key={label}
              className={`flex-1 py-1 text-center text-xs ${
                i === 0
                  ? "text-red-500"
                  : i === 6
                    ? "text-blue-500"
                    : "text-text-secondary"
              }`}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 px-2">
          {days.map((day) => {
            const isSelected = day.dateStr === value;
            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => {
                  onSelect(day.dateStr);
                  onClose();
                }}
                className="flex h-11 cursor-pointer items-center justify-center"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    isSelected
                      ? "bg-brown-primary font-bold text-white"
                      : !day.isCurrentMonth
                        ? "text-zinc-300"
                        : "text-text-primary"
                  }`}
                >
                  {day.dayOfMonth}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
