import KnowledgeListClient from "@/components/bible/KnowledgeListClient";
import {
  getCategoryHasSearch,
  getCategoryOrder,
  getCategoryTitle,
  getKnowledgeItems,
  isValidCategory,
} from "@/lib/bible/knowledge-config";
import { notFound } from "next/navigation";

export default async function KnowledgeListPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isValidCategory(category)) notFound();

  const items = await getKnowledgeItems(category);

  return (
    <KnowledgeListClient
      categorySlug={category}
      title={getCategoryTitle(category)}
      categoryOrder={getCategoryOrder(category)}
      hasSearch={getCategoryHasSearch(category)}
      items={items}
    />
  );
}
