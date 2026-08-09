import ScrapDetailClient from "@/components/ScrapDetailClient";
import { getScrapGroupName, getScrapsForGroup } from "@/lib/actions/scraps";
import { notFound } from "next/navigation";

export default async function ScrapDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const id = Number(groupId);
  const groupName = await getScrapGroupName(id);
  if (!groupName) notFound();

  const scraps = await getScrapsForGroup(id);

  return (
    <ScrapDetailClient groupId={id} groupName={groupName} initialScraps={scraps} />
  );
}