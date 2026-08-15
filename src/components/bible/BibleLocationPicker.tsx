"use client";

import BookChapterPickerSheet from "@/components/bible/BookChapterPickerSheet";
import { useState } from "react";

export default function BibleLocationPicker({
  bookId,
  title,
  translation,
  secondary,
}: {
  bookId: number;
  title: string;
  translation: string;
  secondary?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="shrink-0 whitespace-nowrap text-base font-bold text-white cursor-pointer"
      >
        {title}
      </button>
      {isOpen && (
        <BookChapterPickerSheet
          onClose={() => setIsOpen(false)}
          initialBookId={bookId}
          translation={translation}
          secondary={secondary}
        />
      )}
    </>
  );
}
