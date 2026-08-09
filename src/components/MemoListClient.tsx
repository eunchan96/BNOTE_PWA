"use client";

import BackButton from "@/components/BackButton";
import type { VerseMemoListRow } from "@/lib/actions/verse-memos";
import type { WordMemoListRow } from "@/lib/actions/word-memos";
import Link from "next/link";
import { useState } from "react";

export default function MemoListClient({
  verseMemos,
  wordMemos,
}: {
  verseMemos: VerseMemoListRow[];
  wordMemos: WordMemoListRow[];
}) {
  const [tab, setTab] = useState<"verse" | "word">("verse");

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">메모</h1>
      </header>

      <div className="flex bg-zinc-50">
        <button
          type="button"
          onClick={() => setTab("verse")}
          className={`flex-1 cursor-pointer py-3 text-center text-sm ${
            tab === "verse"
              ? "font-bold text-brown-primary"
              : "text-nav-unselected"
          }`}
        >
          구절 메모
        </button>
        <button
          type="button"
          onClick={() => setTab("word")}
          className={`flex-1 cursor-pointer py-3 text-center text-sm ${
            tab === "word"
              ? "font-bold text-brown-primary"
              : "text-nav-unselected"
          }`}
        >
          단어 메모
        </button>
      </div>
      <div className="border-t border-divider" />

      {tab === "verse" && <VerseMemoList memos={verseMemos} />}
      {tab === "word" && <WordMemoList memos={wordMemos} />}
    </div>
  );
}

function VerseMemoList({ memos }: { memos: VerseMemoListRow[] }) {
  if (memos.length === 0) {
    return (
      <p className="p-6 text-center text-text-secondary">
        아직 작성한 구절 메모가 없어요.
      </p>
    );
  }

  const grouped = new Map<number, VerseMemoListRow[]>();
  for (const m of memos) {
    const list = grouped.get(m.bookId);
    if (list) list.push(m);
    else grouped.set(m.bookId, [m]);
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {[...grouped.entries()].map(([bookId, items]) => (
        <div key={bookId}>
          <p className="px-4 pb-1.5 pt-4 text-[13px] font-bold text-brown-primary">
            {items[0].bookName}
          </p>
          {items.map((m) => (
            <Link
              key={m.id}
              href={`/bible/${m.bookId}/${m.chapter}?verse=${m.verse}`}
              className="block cursor-pointer px-4 py-2.5"
            >
              <p className="line-clamp-2 text-sm text-text-primary">
                <span className="font-bold">
                  {m.chapter}:{m.verse}
                </span>{" "}
                {m.text}
              </p>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

function WordMemoList({ memos }: { memos: WordMemoListRow[] }) {
  if (memos.length === 0) {
    return (
      <p className="p-6 text-center text-text-secondary">
        아직 작성한 단어 메모가 없어요.
      </p>
    );
  }

  const grouped = new Map<number, WordMemoListRow[]>();
  for (const m of memos) {
    const list = grouped.get(m.bookId);
    if (list) list.push(m);
    else grouped.set(m.bookId, [m]);
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {[...grouped.entries()].map(([bookId, items]) => (
        <div key={bookId}>
          <p className="px-4 pb-1.5 pt-4 text-[13px] font-bold text-brown-primary">
            {items[0].bookName}
          </p>
          {items.map((m) => (
            <Link
              key={m.id}
              href={`/bible/${m.bookId}/${m.chapter}?verse=${m.verse}`}
              className="block cursor-pointer px-4 py-2.5"
            >
              <p className="line-clamp-2 text-sm text-text-primary">
                <span className="font-bold">
                  {m.chapter}:{m.verse} {m.word}
                </span>{" "}
                {m.text}
              </p>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
