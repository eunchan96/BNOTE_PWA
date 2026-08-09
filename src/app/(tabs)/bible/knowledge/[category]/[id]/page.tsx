import BackButton from "@/components/common/BackButton";
import {
  getKnowledgeItem,
  isValidCategory,
} from "@/lib/bible/knowledge-config";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = await params;
  if (!isValidCategory(category)) notFound();

  const item = await getKnowledgeItem(category, id);
  if (!item) notFound();

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 truncate text-lg font-bold text-white">
          {item.name}
        </h1>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto p-5">
        <p className="text-sm text-text-secondary">
          {item.subtitle
            ? `${item.category} · ${item.subtitle}`
            : item.category}
        </p>
        <h2 className="mt-1 text-xl font-bold text-text-primary">
          {item.name}
        </h2>

        {item.otherNames && (
          <p className="mt-1 text-sm text-text-secondary">
            다른 이름: {item.otherNames}
          </p>
        )}

        <p className="mt-4 text-base leading-relaxed text-text-primary">
          {item.summary}
        </p>
        <p className="mt-3 text-base leading-relaxed text-text-primary">
          {item.description}
        </p>

        <Link
          href={`/bible/${item.keyBookId}/${item.keyChapter}`}
          className="mt-6 cursor-pointer rounded-lg bg-brown-primary px-4 py-3 text-center font-medium text-white"
        >
          {item.keyVerseLabel} 보러 가기
        </Link>
      </div>
    </div>
  );
}
