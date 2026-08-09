import ScrapGroupListClient from "@/components/ScrapGroupListClient";
import { getScrapGroups } from "@/lib/actions/scraps";

export default async function ScrapGroupListPage() {
  const groups = await getScrapGroups();
  return <ScrapGroupListClient initialGroups={groups} />;
}