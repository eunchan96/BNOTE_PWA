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

  // 안드로이드에는 상세 화면 템플릿이 두 가지 있다:
  // - 인물/장소: 다른 이름 줄이 있고, 요약이 16sp 굵게(강조)
  // - 문화/단위/비유: 다른 이름 줄이 없고, 요약이 15sp 안 굵게(부가 설명)
  const hasOtherNamesVariant = category === "figures" || category === "places";

  return (
    <div className="flex flex-1 flex-col bg-surface-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-brown-primary pl-1">
        <BackButton />
        <h1 className="ml-1 flex-1 truncate text-lg font-bold text-white">
          {item.name}
        </h1>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto p-5">
        <p className="text-13 font-bold text-brown-primary">
          {item.subtitle
            ? `${item.category} · ${item.subtitle}`
            : item.category}
        </p>
        <h2 className="mt-1.5 text-22 font-bold text-text-primary">
          {item.name}
        </h2>

        {hasOtherNamesVariant ? (
          <>
            {item.otherNames && (
              <p className="mt-0.5 text-13 text-text-secondary">
                다른 이름: {item.otherNames}
              </p>
            )}
            <p className="mt-3.5 text-base font-bold leading-relaxed text-text-primary">
              {item.summary}
            </p>
          </>
        ) : (
          <p className="mt-2.5 text-15 leading-relaxed text-text-secondary">
            {item.summary}
          </p>
        )}

        <p className="mt-3 text-15 leading-relaxed text-text-primary">
          {item.description}
        </p>

        <Link
          href={`/bible/${item.keyBookId}/${item.keyChapter}`}
          className="mt-6 cursor-pointer rounded-lg bg-input-background p-[14px] text-center text-15 font-bold text-brown-primary"
        >
          {item.keyVerseLabel} 보러 가기
        </Link>
      </div>
    </div>
  );
}
