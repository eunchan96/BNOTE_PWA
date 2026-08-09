import KnowledgeListClient from "@/components/KnowledgeListClient";
import {
  getCategoryOrder,
  getCategoryTitle,
  getKnowledgeItems,
  isValidCategory,
} from "@/lib/knowledge-config";
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
      items={items}
    />
  );
}