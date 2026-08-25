"use client";

import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";
import Link from "next/link";
import { createPortal } from "react-dom";

export default function SermonMenuDrawer({ onClose }: { onClose: () => void }) {
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

        <Link
          href="/sermons/categories"
          onClick={onClose}
          className="cursor-pointer p-4 text-[15px] text-zinc-900"
        >
          설교 카테고리 관리
        </Link>
        <Link
          href="/sermons/preachers"
          onClick={onClose}
          className="cursor-pointer p-4 text-[15px] text-zinc-900"
        >
          설교자 관리
        </Link>

        <div className="border-t border-divider" />

        <Link
          href="/application/categories"
          onClick={onClose}
          className="cursor-pointer p-4 text-[15px] text-zinc-900"
        >
          적용 카테고리 관리
        </Link>
      </div>
    </div>,
    document.body,
  );
}
