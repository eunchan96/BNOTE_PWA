"use client";

import BackButton from "@/components/BackButton";
import type { VersionedTextContent } from "@/lib/appendix";
import { useState } from "react";

export default function VersionedTextViewer({
  content,
}: {
  content: VersionedTextContent;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const version = content.versions[selectedIndex];

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">
          {content.title}
        </h1>
      </header>

      <div className="flex bg-zinc-50">
        {content.versions.map((v, index) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className={`flex-1 cursor-pointer py-3 text-center text-sm ${
              index === selectedIndex
                ? "font-bold text-brown-primary"
                : "text-nav-unselected"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="border-t border-divider" />

      <div className="flex-1 overflow-y-auto p-5">
        {version.lines.map((line, i) => (
          <p
            key={i}
            className="mb-2 text-base leading-relaxed text-text-primary"
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
