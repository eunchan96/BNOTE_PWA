import BackButton from "@/components/common/BackButton";
import { UNIT_CATEGORIES } from "@/lib/bible/units";
import Link from "next/link";

export default function UnitHubPage() {
  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">
          성경의 단위들
        </h1>
      </header>

      <div className="flex flex-col">
        {UNIT_CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`/bible/knowledge/units/${encodeURIComponent(category)}`}
            className="flex cursor-pointer items-center justify-between border-b border-divider p-[18px]"
          >
            <span className="text-base text-text-primary">{category}</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="var(--color-text-hint)"
            >
              <path d="M8.59,16.59L10,18l6,-6 -6,-6 -1.41,1.41L13.17,12z" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
