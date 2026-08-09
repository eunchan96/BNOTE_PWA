"use client";

import MonthYearPickerSheet from "@/components/sermon/MonthYearPickerSheet";
import type { SermonListRow } from "@/lib/actions/sermon/sermons";
import Link from "next/link";
import { useState } from "react";

type DayCell = {
  dateStr: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  colors: string[];
};

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarTab({ sermons }: { sermons: SermonListRow[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month0, setMonth0] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toDateStr(today));
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const todayStr = toDateStr(today);

  const colorsByDate = new Map<string, string[]>();
  for (const s of sermons) {
    const list = colorsByDate.get(s.sermonDate) ?? [];
    list.push(s.colorHex ?? "#B0BEC5");
    colorsByDate.set(s.sermonDate, list);
  }

  const firstOfMonth = new Date(year, month0, 1);
  const startOffset = firstOfMonth.getDay(); // 0=일
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const gridStart = new Date(year, month0, 1 - startOffset);

  const days: DayCell[] = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const dateStr = toDateStr(d);
    return {
      dateStr,
      dayOfMonth: d.getDate(),
      isCurrentMonth: d.getMonth() === month0,
      isToday: dateStr === todayStr,
      colors: (colorsByDate.get(dateStr) ?? []).slice(0, 4),
    };
  });

  const sermonsForSelectedDate = sermons
    .filter((s) => s.sermonDate === selectedDate)
    .sort((a, b) => a.id - b.id);

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

  function goToToday() {
    setYear(today.getFullYear());
    setMonth0(today.getMonth());
    setSelectedDate(todayStr);
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* 달력 컨트롤 줄 (흰 배경, 상단 브라운 바와는 별개) */}
      <div className="flex items-center">
        <div className="flex-1">
          <button
            type="button"
            onClick={goToToday}
            className="ml-4 cursor-pointer py-2.5 text-[13px] text-brown-primary"
          >
            오늘
          </button>
        </div>
        <button
          type="button"
          onClick={goToPrevMonth}
          className="cursor-pointer p-4 text-zinc-500"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={() => setShowMonthPicker(true)}
          className="cursor-pointer px-4 py-4 text-[17px] font-bold text-text-primary"
        >
          {year}년 {month0 + 1}월
        </button>
        <button
          type="button"
          onClick={goToNextMonth}
          className="cursor-pointer p-4 text-zinc-500"
        >
          ▶
        </button>
        <div className="flex-1" />
      </div>

      {/* 요일 헤더 */}
      <div className="flex pb-1">
        {["일", "월", "화", "수", "목", "금", "토"].map((label, i) => (
          <span
            key={label}
            className={`flex-1 text-center text-xs ${
              i === 0
                ? "text-red-500"
                : i === 6
                  ? "text-blue-500"
                  : "text-text-primary"
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => setSelectedDate(day.dateStr)}
              className="flex h-[53px] cursor-pointer flex-col items-center pt-1"
            >
              <span
                className={`text-sm ${isSelected ? "font-bold" : ""} ${
                  !day.isCurrentMonth
                    ? "text-zinc-300"
                    : day.isToday
                      ? "text-blue-500"
                      : isSelected
                        ? "text-brown-primary"
                        : "text-text-primary"
                }`}
              >
                {day.dayOfMonth}
              </span>
              <div className="mt-0.5 flex w-full px-4 flex-col gap-0.5">
                {day.colors.map((c, i) => (
                  <span
                    key={i}
                    className="h-[3px] w-full rounded-full"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2 border-t border-divider" />

      {sermonsForSelectedDate.length === 0 ? (
        <p className="p-6 text-center text-text-secondary">
          이 날짜에 등록된 설교가 없어요
        </p>
      ) : (
        <ul className="flex flex-col">
          {sermonsForSelectedDate.map((sermon) => (
            <li key={sermon.id}>
              <Link
                href={`/sermons/${sermon.id}`}
                className="flex cursor-pointer items-center gap-3 p-3"
              >
                <span
                  className="h-9 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: sermon.colorHex ?? "#B0BEC5" }}
                />
                <span className="flex-1 truncate text-[15px] text-text-primary">
                  {sermon.title}
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="text-xs text-zinc-400">
                    {sermon.preacherName ?? "설교자 미지정"}
                  </span>
                  {sermon.refLabel && (
                    <span className="mt-0.5 text-xs text-brown-primary">
                      {sermon.refLabel}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showMonthPicker && (
        <MonthYearPickerSheet
          initialYear={year}
          onSelect={(y, m) => {
            setYear(y);
            setMonth0(m);
          }}
          onClose={() => setShowMonthPicker(false)}
        />
      )}
    </div>
  );
}
