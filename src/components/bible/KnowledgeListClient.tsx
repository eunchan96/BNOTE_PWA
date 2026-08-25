"use client";

import BackButton from "@/components/common/BackButton";
import type { KnowledgeItem } from "@/lib/bible/knowledge-config";
import Link from "next/link";
import { useState } from "react";

export default function KnowledgeListClient({
  categorySlug,
  title,
  categoryOrder,
  hasSearch,
  items,
}: {
  categorySlug: string;
  title: string;
  categoryOrder: string[];
  hasSearch: boolean;
  items: KnowledgeItem[];
}) {
  const [keyword, setKeyword] = useState("");

  const trimmed = keyword.trim();
  const filtered = trimmed
    ? items.filter(
        (i) =>
          i.name.includes(trimmed) ||
          (i.otherNames ?? "").includes(trimmed) ||
          i.summary.includes(trimmed),
      )
    : items;

  const grouped = new Map<string, KnowledgeItem[]>();
  for (const item of filtered) {
    const list = grouped.get(item.category);
    if (list) list.push(item);
    else grouped.set(item.category, [item]);
  }

  const orderedCategories = [
    ...categoryOrder.filter((c) => grouped.has(c)),
    ...[...grouped.keys()].filter((c) => !categoryOrder.includes(c)),
  ];

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">{title}</h1>
      </header>

      {hasSearch && (
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="이름 또는 내용 검색"
          className="m-3 rounded-lg border border-divider p-3 text-15"
        />
      )}

      {filtered.length === 0 && (
        <p className="flex-1 p-8 text-center text-text-hint">
          검색 결과가 없어요.
        </p>
      )}

      <div className="flex flex-1 flex-col overflow-y-auto">
        {orderedCategories.map((category) => (
          <div key={category}>
            <p className="px-4 pb-1.5 pt-4 text-13 font-bold text-brown-primary">
              {category}
            </p>
            {grouped.get(category)!.map((item) => (
              <Link
                key={item.id}
                href={`/bible/knowledge/${categorySlug}/${item.id}`}
                className="block cursor-pointer px-4 py-2.5"
              >
                <p className="text-15 font-bold text-text-primary">
                  {item.name}
                </p>
                <p className="mt-0.5 text-13 text-text-secondary">
                  {item.summary}
                </p>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
