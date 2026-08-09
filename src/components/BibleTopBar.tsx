"use client";

import BibleLocationPicker from "@/components/BibleLocationPicker";
import BibleMenuDrawer from "@/components/BibleMenuDrawer";
import TranslationPickerSheet from "@/components/TranslationPickerSheet";
import Link from "next/link";
import { useState } from "react";

export default function BibleTopBar({
  bookId,
  chapter,
  title,
  translation,
  secondary,
}: {
  bookId: number;
  chapter: number;
  title: string;
  translation: string;
  secondary?: string;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center overflow-x-auto bg-brown-primary px-2">
      <button
        type="button"
        onClick={() => setIsPickerOpen(true)}
        aria-label="대역본 선택"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full opacity-90 cursor-pointer"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M21,5c-1.11,-0.35 -2.33,-0.5 -3.5,-0.5c-1.95,0 -4.05,0.4 -5.5,1.5c-1.45,-1.1 -3.55,-1.5 -5.5,-1.5S2.45,4.9 1,6v14.65c0,0.25 0.25,0.5 0.5,0.5c0.1,0 0.15,-0.05 0.25,-0.05C3.1,20.45 5.05,20 6.5,20c1.95,0 4.05,0.4 5.5,1.5c1.35,-0.85 3.8,-1.5 5.5,-1.5c1.65,0 3.35,0.3 4.75,1.05c0.1,0.05 0.15,0.05 0.25,0.05c0.25,0 0.5,-0.25 0.5,-0.5V6C22.4,5.55 21.75,5.25 21,5z M21,18.5c-1.1,-0.35 -2.3,-0.5 -3.5,-0.5c-1.7,0 -4.15,0.65 -5.5,1.5V8c1.35,-0.85 3.8,-1.5 5.5,-1.5c1.2,0 2.4,0.15 3.5,0.5V18.5z" />
        </svg>
      </button>

      <div className="ml-2">
        <BibleLocationPicker
          bookId={bookId}
          title={title}
          translation={translation}
          secondary={secondary}
        />
      </div>

      <div className="flex-1" />

      <Link
        href={`/bible/search?translation=${translation}${secondary ? `&secondary=${secondary}` : ""}`}
        aria-label="검색"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full opacity-90"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M15.5,14h-0.79l-0.28,-0.27C15.41,12.59 16,11.11 16,9.5 16,5.91 13.09,3 9.5,3S3,5.91 3,9.5 5.91,16 9.5,16c1.61,0 3.09,-0.59 4.23,-1.57l0.27,0.28v0.79l5,4.99L20.49,19l-4.99,-5zM9.5,14C7.01,14 5,11.99 5,9.5S7.01,5 9.5,5 14,7.01 14,9.5 11.99,14 9.5,14z" />
        </svg>
      </Link>
      <Link
        href="/bible/bookmarks"
        aria-label="북마크"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full opacity-90"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M17,3H7c-1.1,0 -2,0.9 -2,2v16l7,-3 7,3V5c0,-1.1 -0.9,-2 -2,-2z" />
        </svg>
      </Link>
      <button
        type="button"
        onClick={() => setIsMenuOpen(true)}
        aria-label="메뉴"
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-90"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M3,18h18v-2H3v2zM3,13h18v-2H3v2zM3,6v2h18V6H3z" />
        </svg>
      </button>

      {isPickerOpen && (
        <TranslationPickerSheet
          bookId={bookId}
          chapter={chapter}
          translation={translation}
          secondary={secondary}
          onClose={() => setIsPickerOpen(false)}
        />
      )}

      {isMenuOpen && <BibleMenuDrawer onClose={() => setIsMenuOpen(false)} />}
    </header>
  );
}

function TopBarIconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full opacity-90 cursor-pointer"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
        {children}
      </svg>
    </button>
  );
}
