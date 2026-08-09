import BackButton from "@/components/BackButton";
import Link from "next/link";

const MENU_ITEMS = [
  { label: "인물사전", href: "/bible/knowledge/figures" },
  { label: "지명사전", href: "/bible/knowledge/places" },
  { label: "족보", href: "/bible/knowledge/genealogy" },
  { label: "연대표", href: "/bible/knowledge/timeline" },
  { label: "당시 문화", href: "/bible/knowledge/culture" },
  { label: "성경의 단위들", href: "/bible/knowledge/units" },
  { label: "예수님의 비유와 이적", href: "/bible/knowledge/parables" },
  { label: "상황에 따라 찾는 말씀", href: "/bible/knowledge/topics" },
];

export default function KnowledgeHubPage() {
  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 text-lg font-bold text-white">
          성경 배경지식
        </h1>
      </header>

      <div className="flex flex-col">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex cursor-pointer items-center justify-between border-b border-divider px-4 py-4"
          >
            <span className="text-[15px] text-text-primary">{item.label}</span>
            <span className="text-zinc-400">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
