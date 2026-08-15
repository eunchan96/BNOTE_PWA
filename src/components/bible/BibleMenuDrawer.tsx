"use client";

import {
  saveAutoScrollEnabled,
  saveReadingPlanEnabled,
} from "@/lib/actions/bible/preferences";
import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";

const APPENDIX_ITEMS = [
  { label: "주기도문", slug: "lords-prayer" },
  { label: "사도신경", slug: "apostles-creed" },
  { label: "십계명", slug: "ten-commandments" },
  { label: "교독문", slug: "responsive-reading" },
];

export default function BibleMenuDrawer({
  readingPlanEnabled,
  autoScrollEnabled,
  onClose,
}: {
  readingPlanEnabled: boolean;
  autoScrollEnabled: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isAppendixOpen, setIsAppendixOpen] = useState(false);
  const [readingPlanChecked, setReadingPlanChecked] =
    useState(readingPlanEnabled);
  const [autoScrollChecked, setAutoScrollChecked] = useState(autoScrollEnabled);

  function handleToggleReadingPlan(value: boolean) {
    setReadingPlanChecked(value);
    saveReadingPlanEnabled(value).then(() => router.refresh());
  }

  function handleToggleAutoScroll(value: boolean) {
    setAutoScrollChecked(value);
    saveAutoScrollEnabled(value).then(() => router.refresh());
  }

  useLockBodyScroll();

  return createPortal(
    <div className="fixed inset-0 z-30 flex justify-end">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/40"
      />

      <div className="relative flex h-full w-[280px] flex-col bg-white shadow-xl">
        <p className="p-4 text-lg font-bold text-zinc-900">메뉴</p>
        <div className="border-t border-divider" />

        <div className="flex flex-1 flex-col overflow-y-auto">
          <MenuLink href="/bible/hymns" label="찬송" onClick={onClose} />

          <button
            type="button"
            onClick={() => setIsAppendixOpen((v) => !v)}
            className="flex cursor-pointer items-center justify-between p-4 text-left text-15 text-zinc-900"
          >
            부록
            <span className="text-zinc-400">{isAppendixOpen ? "▴" : "▾"}</span>
          </button>
          {isAppendixOpen && (
            <div className="flex flex-col bg-zinc-50">
              {APPENDIX_ITEMS.map((item) => (
                <Link
                  key={item.slug}
                  href={`/bible/appendix/${item.slug}`}
                  onClick={onClose}
                  className="cursor-pointer py-3.5 pl-8 pr-4 text-15 text-zinc-800"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          <MenuLink
            href="/bible/knowledge"
            label="성경 배경지식"
            onClick={onClose}
          />

          <div className="border-t border-divider" />

          <MenuLink href="/bible/scraps" label="스크랩" onClick={onClose} />
          <MenuLink
            href="/bible/highlights"
            label="하이라이트"
            onClick={onClose}
          />
          <MenuLink href="/bible/memos" label="메모" onClick={onClose} />

          <div className="border-t border-divider" />

          <ToggleRow
            label="성경읽기표 활성화"
            checked={readingPlanChecked}
            onChange={handleToggleReadingPlan}
          />
          <ToggleRow
            label="자동스크롤 활성화"
            checked={autoScrollChecked}
            onChange={handleToggleAutoScroll}
          />
          {/* 방해금지 모드는 안드로이드 기기 전용 기능이라 웹에는 없음 */}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MenuLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="cursor-pointer p-4 text-15 text-zinc-900"
    >
      {label}
    </Link>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-center justify-between p-4 text-left"
    >
      <span className="text-15 text-zinc-900">{label}</span>
      <span
        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
          checked ? "bg-brown-primary" : "bg-zinc-300"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
